/* eslint-disable no-bitwise */
import {
  commands,
  measurementType,
  responseType
} from './constants.js';
import {
  bufferToHex,
  appendBuffer,
  log,
  dir,
  EventEmitter,
  nonZero
} from './utils.js';

import { Sensor, MeasurementInfo, SensorSpecs } from './Sensor.js';

let _TextDecoder;

export default class Device extends EventEmitter {
  constructor(device) {
    super();
    if (typeof TextDecoder === 'undefined') {
      const encoding = require('text-encoding');
      _TextDecoder = encoding.TextDecoder;
    } else {
      _TextDecoder = TextDecoder;
    }

    this.device = device;
    this.sensors = [];
    this.opened = false;
    this.rollingCounter = 0;
    this.collecting = false;
    this.measurementPeriod = 10; // milliseconds
    this.response = null;
    this.remainingResponseLength = 0;
    this.defaultSensorsMask = 0;
    this.keepValues = true; // keep all the values during a collection
    this.minMeasurementPeriod = 10; // minimum period in milliseconds

    this.serialNumber = '';
    this.orderCode = '';
    this.name = '';
  }

  /**
  * Returns a percentage of battery remaining
  * @name getBatteryLevel
  * @returns {number}
  */
  async getBatteryLevel() {
    const status = await this._getStatus();
    return status.battery;
  }

  /**
  * Returns the battery charging state. See constants.js for defined charging states
  * @name getChargingState
  * @returns {number}
  */
  async getChargingState() {
    const status = await this._getStatus();
    return status.chargingStatus;
  }

  /**
  * Open the device and get information
  * @name open
  * @param {boolean} autoStart if set to true the device enables default sensors and starts measurements.
  */
  async open(autoStart = false) {
    try {
      await this._connect();
      await this._init();
      await this._getStatus();
      await this._getDeviceInfo();
      await this._getDefaultSensorsMask();
      await this._getAvailableSensors();

      this._onOpened();

      if (autoStart) {
        this.start();
      }
    } catch (err) {
      console.error(err);
    }
  }

  /**
  * Close the device, stop measurements and send the disconnect.
  * @name close
  */
  async close() {
    await this._stopMeasurements();
    await this._sendCommand(commands.DISCONNECT);
    return this._disconnect();
  }

  /**
  * Enable the default sensors specified by the device.
  * @name enableDefaultSensors
  */
  enableDefaultSensors() {
    let mask = 1;

    for (let i = 0; i < 32; ++i) {
      if ((this.defaultSensorsMask & mask) === mask) {
        const sensor = this.getSensor(i);
        if (sensor) {
          sensor.setEnabled(true);
        }
      }
      mask <<= 1;
    }
  }

  /**
  * Start measurements on the enabled sensors. If no sensors are enabled
  * then enable the default sensors. If a period is specified then use it,
  * if not use the fastest typical from the enabled sensors.
  * @name start
  * @param {number} period
  */
  start(period = null) {
    let enabledSensors = this.sensors.filter(s => s.enabled);

    // And make sure at least one sensor is enabled.
    if (enabledSensors.length === 0) {
      this.enableDefaultSensors();
      enabledSensors = this.sensors.filter(s => s.enabled);
    }

    // Clear out the last collection's values.
    enabledSensors.forEach(s => s.clear());

    // If the user passed in a period then use it
    if (period) {
      this.measurementPeriod = period;
    }

    this._startMeasurements();
  }

  /**
  * Stop measurements on the device.
  * @name stop
  */
  stop() {
    this._stopMeasurements();
  }

  /**
  * Based on a number return the sensor.
  * @name getSensor
  * @returns {sensor}
  */
  getSensor(number) {
    return this.sensors.find(c => c.number === number);
  }

  async _connect() {
    return this.device.setup({
      onClosed: () => this._onClosed(),
      onResponse: data => this._handleResponse(data)
    });
  }

  async _disconnect() {
    return this.device.close();
  }

  _init() {
    this.collecting = false;
    this.rollingCounter = 0xFF;
    this.writeQueue = [];

    return this._sendCommand(commands.INIT);
  }

  _handleResponse(notification) {
    log(`command notified: ${bufferToHex(notification.buffer)}`);

    // If we flagged that we are looking for more data then just pull off more
    if (this.remainingResponseLegnth > 0) {
      this.remainingResponseLegnth -= notification.buffer.byteLength;
      this.response = new DataView(appendBuffer(this.response.buffer, notification.buffer.slice(0)));
      if (this.remainingResponseLegnth > 0) {
        return;
      }
    } else {
      this.response = notification;
    }

    const resLength = this.response.getUint8(1);
    if (resLength > this.response.buffer.byteLength) {
      this.remainingResponseLegnth = resLength - this.response.buffer.byteLength;
      return;
    }

    log(`handle command: ${bufferToHex(this.response.buffer)}`);

    const resType = this.response.getUint8(0);
    switch (resType) {
      case responseType.MEASUREMENT:
        this._processMeasurements(this.response);
        break;
      default: {
        const resCommand = this.response.getUint8(4);
        const resRollingCounter = this.response.getUint8(5);
        const resPacket = new DataView(this.response.buffer, 6);

        this._resolveWriteCommand(resCommand, resRollingCounter, resPacket);
        this.remainingResponseLegnth = 0;
        this.response = null;
        break;
      }
    }
  }

  _getSensorsWithMask(channelMask) {
    const sensors = [];
    let mask = 1;

    for (let i = 0; i < 32; ++i) {
      if ((channelMask & mask) === mask) {
        const sensor = this.getSensor(i);
        if (sensor) {
          sensors.push(sensor);
          log(`available: [${channelMask}] ${sensors[sensors.length - 1].number}`);
        }
      }
      mask <<= 1;
    }
    return sensors;
  }

  _processMeasurements(response) {
    let sensors = [];
    let isFloat = true;
    let valueCount = 0;
    let index = 0;

    const type = response.getUint8(4);
    switch (type) {
      case measurementType.NORMAL_REAL32: {
        sensors = this._getSensorsWithMask(response.getUint16(5, true));
        valueCount = response.getUint8(7, true);
        index = 9;
        break;
      }
      case measurementType.WIDE_REAL32: {
        sensors = this._getSensorsWithMask(response.getUint32(5, true));
        valueCount = response.getUint8(9, true);
        index = 11;
        break;
      }
      case measurementType.APERIODIC_REAL32:
      case measurementType.SINGLE_CHANNEL_REAL32: {
        sensors[0] = this.getSensor(response.getUint8(6));
        valueCount = response.getUint8(7, true);
        index = 8;
        break;
      }
      case measurementType.APERIODIC_INT32:
      case measurementType.SINGLE_CHANNEL_INT32: {
        sensors[0] = this.getSensor(response.getUint8(6));
        valueCount = response.getUint8(7, true);
        index = 8;
        isFloat = false;
        break;
      }
      case measurementType.START_TIME:
      case measurementType.DROPPED:
      case measurementType.PERIOD: {
        log(`Purposely Ignoring packet type: ${type}`);
        break;
      }
      default:
        log(`Unknown packet type: ${type}`);
    }

    for (let count = 0; count < valueCount; ++count) {
      for (let ix = 0; ix < sensors.length; ++ix) {
        if (isFloat) {
          sensors[ix].setValue(response.getFloat32(index, true), this.keepValues);
        } else {
          sensors[ix].setValue(response.getInt32(index, true), this.keepValues);
        }
        index += 4;
      }
    }
  }

  _resolveWriteCommand(command, rollingCounter, response) {
    const item = this.writeQueue.find(q => q.command === command && q.rollingCounter === rollingCounter);

    if (item) {
      item.resolve(response);
      this.writeQueue = this.writeQueue.filter(q => q !== item);
    }
  }

  _onOpened() {
    log('opened');
    this.opened = true;
    this.emit('device-opened');
  }

  _onClosed() {
    log('closed');
    this.opened = false;
    this.emit('device-closed');
  }


  _decRollingCounter() {
    this.rollingCounter -= 1;
    return this.rollingCounter;
  }

  _calculateChecksum(buff) {
    const length = buff[1];
    let checksum = -1 * buff[3];

    for (let i = 0; i < length; ++i) {
      checksum += buff[i];
      checksum &= 0xFF;
    }

    if (checksum < 0 || checksum > 255) {
      log('Checksum failed!');
      return 0;
    }

    return checksum;
  }

  _sendCommand(subCommand) {
    const command = new Uint8Array(commands.HEADER.byteLength + subCommand.byteLength);
    command.set(new Uint8Array(commands.HEADER), 0);
    command.set(new Uint8Array(subCommand), commands.HEADER.byteLength);

    // Populate the packet header bytes
    command[1] = command.length;
    command[2] = this._decRollingCounter();
    command[3] = this._calculateChecksum(command);

    return this._queueWriteCommand(command, 0, command.length);
  }

  // commands
  async _writeCommand(command, offset, remaining) {
    let val;
    while (remaining > 0) {
      try {
        if (remaining > 20) {
          val = command.subarray(offset, offset + 20);
          remaining -= 20;
          offset += 20;
        } else {
          val = command.subarray(offset, offset + remaining);
          remaining = 0;
        }
        await this.device.writeCommand(val); // eslint-disable-line no-await-in-loop
      } catch (error) {
        log(`Write Failure: ${error}`);
      }
    }
  }

  _queueWriteCommand(command, offset, remaining) {
    log(`command queued: ${bufferToHex(command)}`);
    const promise = new Promise((resolve, reject) => {
      this.writeQueue.push({
        command: command[4],
        rollingCounter: command[2],
        resolve,
        reject
      });
      setTimeout(() => {
        this.writeQueue = this.writeQueue.filter(q => q.command === command[4] && q.rollingCounter !== command[2]);
        reject(new Error(`write command timed out after 5s. Command: ${command[4].toString(16)} Rolling Counter: ${command[2].toString(16)}`));
      }, 10000);
    });

    this._writeCommand(command, offset, remaining);

    return promise;
  }

  async _getStatus() {
    const response = await this._sendCommand(commands.GET_STATUS);
    const status = {
      masterFirmwareVersion: `${response.getUint8(2)}.${response.getUint8(3)}`,
      bleFirmwareVersion: `${response.getUint8(6)}.${response.getUint8(9)}`,
      battery: response.getUint8(10),
      chargingStatus: `${response.getUint8(11)}`
    };

    return status;
  }

  async _getAvailableSensors() {
    await this._sendCommand(commands.GET_SENSOR_IDS).then((response) => {
      this.availableSensors = response.getUint32(0, true);
      log(`Get Available Sensors Returned ${this.availableSensors}`);
    });

    let mask = 1;
    for (let i = 0; i < 31; ++i) {
      if ((this.availableSensors & mask) === mask) {
        await this._getSensorInfo(i); // eslint-disable-line no-await-in-loop
      }
      mask <<= 1;
    }
  }

  _getDefaultSensorsMask() {
    return this._sendCommand(commands.GET_DEFAULT_SENSORS_MASK).then((response) => {
      this.defaultSensorsMask = response.getUint32(0, true);
      log(`Default Sensors:`);
      dir(this);
    });
  }

  _getDeviceInfo() {
    return this._sendCommand(commands.GET_INFO).then((response) => {
      const decoder = new _TextDecoder('utf-8');

      // OrderCode offset = 6 (header+cmd+counter)
      // Ordercode length = 16
      this.orderCode = decoder.decode(new Uint8Array(response.buffer, 6, 16).filter(nonZero));

      // SerialNumber offset = 22 (OrderCode offset + Ordercode length)
      // SerialNumber length = 16
      this.serialNumber = decoder.decode(new Uint8Array(response.buffer, 22, 16).filter(nonZero));

      // DeviceName offset = 38 (SerialNumber offset + SerialNumber length)
      // DeviceName length = 32
      this.name = decoder.decode(new Uint8Array(response.buffer, 38, 32).filter(nonZero));

      log(`Device Info:`);
      dir(this);
    });
  }

  async _getSensorInfo(i) {
    const command = new Uint8Array(commands.GET_SENSOR_INFO);

    command[1] = i;

    return this._sendCommand(command).then((response) => {
      // We are getting false positives returned so making sure it has a sensorid sorts that out
      // until I can get with Kevin to figure out what is going on.
      const sensorId = response.getUint32(2, true);
      if (sensorId > 0) {
        const decoder = new _TextDecoder('utf-8');

        const measurementInfo = new MeasurementInfo({
          type: response.getUint8(6), // 0 = Real64 or 1 = Int32
          mode: response.getUint8(7), // 0 = Periodic, 1 = Aperiodic
          minValue: response.getFloat64(108, true),
          maxValue: response.getFloat64(116, true),
          uncertainty: response.getFloat64(100, true),
          minPeriod: response.getUint32(124, true) / 1000,
          maxPeriod: ((response.getUint32(132, true) << 32) + response.getUint32(128, true)) / 1000,
          typicalPeriod: response.getUint32(136, true) / 1000,
          granularity: response.getUint32(140, true) / 1000
        });

        const sensorSpecs = new SensorSpecs({
          number: response.getUint8(0),
          // sensorDescription offset = 14 (6 bytes (header+cmd+counter) + 8 bytes (other fields))
          // sensorDescription length = 60
          name: decoder.decode(new Uint8Array(response.buffer, 14, 60).filter(nonZero)),
          // sensorUnit offset = 74 (sensorDescription offset + sensorDescription length)
          // sensorUnit length = 32
          unit: decoder.decode(new Uint8Array(response.buffer, 74, 32).filter(nonZero)),
          mutalExclusiveMask: response.getUint32(144, true),
          measurementInfo,
          sensorId
        });

        const sensor = new Sensor(sensorSpecs);

        log(`Get Sensor Info Returned`);
        dir(sensor);

        this.sensors.push(sensor);
        sensor.on('state-changed', () => {
          log(`Sensor Restart: ${sensor.number}`);

          // Look through all the sensors to make sure that they aren't mutually exclusive.
          if (sensor.enabled) {
            this.measurementPeriod = sensor.specs.measurementInfo.typicalPeriod;
            this.sensors.forEach((sensor2) => {
              if (sensor.number !== sensor2.number) {
                if (sensor2.enabled) {
                  const mask = 1 << sensor2.number;
                  if ((mask & sensor.specs.mutalExclusiveMask) === mask) {
                    sensor2.enabled = false;
                  } else if (sensor2.specs.measurementInfo.typicalPeriod > this.measurementPeriod) {
                    this.measurementPeriod = sensor2.specs.measurementInfo.typicalPeriod;
                  }
                }
              }
            });
          }

          this._restartMeasurements();
        });
      }
    });
  }

  async _restartMeasurements() {
    const wasCollecting = this.collecting;
    if (this.collecting) {
      try {
        await this._stopMeasurements();
      } catch (err) {
        console.error(err);
      }
    }
    if (!this.collecting && wasCollecting) {
      try {
        await this._startMeasurements();
      } catch (err) {
        console.error(err);
      }
    }
  }

  _setMeasurementPeriod(measurementPeriodInMicroseconds) {
    const command = new Uint8Array(commands.SET_MEASUREMENT_PERIOD);
    const minMeasurementPeriodInMicroseconds = this.minMeasurementPeriod * 1000;

    if (measurementPeriodInMicroseconds < minMeasurementPeriodInMicroseconds) {
      measurementPeriodInMicroseconds = minMeasurementPeriodInMicroseconds;
    }

    log(`MeasurementPeriod: ${measurementPeriodInMicroseconds}`);
    command[3] = (measurementPeriodInMicroseconds >> 0) & 0xFF;
    command[4] = (measurementPeriodInMicroseconds >> 8) & 0xFF;
    command[5] = (measurementPeriodInMicroseconds >> 16) & 0xFF;
    command[6] = (measurementPeriodInMicroseconds >> 24) & 0xFF;
    return this._sendCommand(command);
  }

  _getEnabledChannelMask() {
    let channelMask = 0;
    const enabledSensors = this.sensors.filter(s => s.enabled);
    enabledSensors.forEach((s) => { channelMask += 1 << s.number; });
    return channelMask;
  }

  _startMeasurements() {
    return this._setMeasurementPeriod(this.measurementPeriod * 1000).then(() => {
      const channelMask = this._getEnabledChannelMask();
      log(`ChannelMask: ${channelMask}`);
      const command = new Uint8Array(commands.START_MEASUREMENTS);
      command[3] = (channelMask >> 0) & 0xFF;
      command[4] = (channelMask >> 8) & 0xFF;
      command[5] = (channelMask >> 16) & 0xFF;
      command[6] = (channelMask >> 24) & 0xFF;
      return this._sendCommand(command).then((response) => {
        if (response.getUint8(0) === 0) {
          this.collecting = true;
          this.emit('measurements-started');
        }
      });
    });
  }

  _stopMeasurements() {
    return this._sendCommand(commands.STOP_MEASUREMENTS).then((response) => {
      if (response.getUint8(0) === 0) {
        this.collecting = false;
        this.emit('measurements-stopped');
      }
    });
  }
}
