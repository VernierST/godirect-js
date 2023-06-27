/* global vec, gcurve, button, graph */
import godirect from './godirect.js';

// trace colors from GA for the chart
const TRACE_COLORS = [
  vec(216 / 255, 38 / 255, 47 / 255),
  // $red
  vec(59 / 255, 139 / 255, 204 / 255),
  // $baby-blue
  vec(186 / 255, 178 / 255, 30 / 255),
  // $vomit
  vec(51 / 255, 69 / 255, 170 / 255),
  // $blue
  vec(226 / 255, 96 / 255, 148 / 255),
  // $pink
  vec(91 / 255, 44 / 255, 99 / 255),
  // $purple
];

/**
 * takes a sensor and returns a concatenation of sensor name and units (if available)
 * @param {Sensor} sensor a sensor object on a GDXDevice
 * @returns {string}
 */
function sensorNameWithUnit(sensor) {
  return `${sensor.name} ${sensor.unit ? `(${sensor.unit})` : ''}`;
}

class VernierGDX extends EventTarget {
  constructor() {
    super();
    this.started = false;
    this.addDevice = this._addDevice.bind(this);
    this.end = this._end.bind(this);
    this.devices = [];
    this.declaredDevices = [];
    this._collectFor = -1;
    this._oldCurves = [];
    this._samplesToCollect = Infinity;
    this._samplesCollected = 0;
    this._setupVenierSections();
  }

  /** @return {boolean} Used as the second in the double while loop for reading measurements. */
  vp_collect_is_pressed() {
    return this.started;
  }

  /** @return {false} doesn't actually change because if it did it would break any program running. Used as the first of a double while loop for reading */
  vp_close_is_pressed() {
    return false;
  }

  /** @type {boolean} */
  get started() {
    return this._started;
  }

  set started(value) {
    this._started = value;
    if (!this.actionButton) return;
    if (value) {
      this.actionButton.textContent = 'Stop';
      this.devices.forEach(deviceElement => deviceElement.deviceStart());
      this.collectionStartTime = new Date();
      this._samplesCollected = 0;
      if (this._graph) {
        this._graph.xmin = 0;
        this._graph.xmax = 5;
        try {
          if(this._oldCurves) {
            this._oldCurves.forEach(curve => curve.remove());
            this._oldCurves = [];
          }
          this._curves.forEach(curve => curve.remove());
          this._curveIndecies = this._curves.map(() => [0]);
        } catch (error) {
          if (
            !this._startedFirstTypeErrorCaught &&
            error.message.includes(`Cannot read properties of undefined (reading 'type')`)
          )
            this._startedFirstTypeErrorCaught = true;
          else console.error(error);
        }
      }
      return;
    }
    this.actionButton.textContent = this._collectionButtonText;
    this.devices.forEach(deviceElement => deviceElement.stopRead());
    delete this.firstRead;
  }

  get samplesPerSecond() {
    return Math.round(1000 / this.period);
  }

  set samplesPerSecond(value) {
    this.period = 1 / (value / 1000);
  }

  /** @type {number} milliseconds between collections */
  get period() {
    return this._period;
  }

  set period(value) {
    this._period = Number(value) || 100;
    if (this.sampleLabel) this.sampleLabel.textContent = `${this.samplesPerSecond} samples/second`;
    this.devices.forEach(element => {
      if (!element) return;
      element.period = this.period;
    });
    this._setSamplesToCollect();
  }

  /** @type {number} seconds between collections */
  get periodS() {
    return Number(this.period / 1000);
  }

  /**
   * runs the device selection and sets up initial sensor state
   */
  async _addDevice() {
    const device = {};
    try {
      device.item = await godirect.selectDevice(this.isBluetoothConnection);
      if (!device.item) throw new Error('Device selection cancelled or failed');
      this.addDeviceButton.text = 'Add another Go Direct Device';
      device.item.stop();
      const deviceEl = this._createSensorInteraction(device);
      if (!this.devices.includes(deviceEl)) this.devices.push(deviceEl);

      if (this.channels === this._unsetChannels) {
        deviceEl.device.item.sensors[0].setEnabled(true);
      } else {
        deviceEl.device.item.sensors.forEach(sensor => {
          let channelIndex = this.declaredDevices.findIndex(
            declaredDeviceName => declaredDeviceName === deviceEl.device.item.name,
          );
          if (channelIndex === -1) channelIndex = 0;
          sensor.setEnabled(this.channels[channelIndex]?.includes(sensor.number));
        });
      }
      deviceEl.setupSensors();

      this.dispatchEvent(new Event('device-connected'));
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * creates a vernier-device element, passes it the GDXDevice connection (or placeholder) and returns it
   * @param {GDXDevice} device a device provided by the GoDirect-js library upon connection
   * @param {boolean} placeholder whether this is going to be a placeholder device element or not
   * @returns {VernierDevice}
   */
  _createSensorInteraction(device, placeholder) {
    const existingEl = this.devices.find(
      deviceEl => deviceEl.device.item.name === device.item.name,
    );
    const deviceEl = existingEl || document.createElement('vernier-device');
    deviceEl.toggleAttribute('placeholder', placeholder);
    device.element = deviceEl;
    deviceEl.device = device;
    deviceEl.period = this.period;
    if (!this._skipDeviceControl) this._deviceSection.append(deviceEl);
    deviceEl.addEventListener('disconnected', () => {
      this.devices.splice(this.devices.indexOf(deviceEl), 1);
      if (!this.devices.length) this._resetState();
    });
    const sensorToggleActions = async () => {
      this.dispatchEvent(new Event('device-sensor-toggled'));
      if (!this._graph) return;
      const enabledSensors = this.devices
        .flatMap(({ device }) => device.item.sensors)
        .filter(sensor => sensor?.enabled);
      this._graph.ytitle = `['${enabledSensors.map(sensorNameWithUnit).join(`', '`)}']`;
      if(this._curves) this._oldCurves = [...this._oldCurves, ...this._curves];
      this._curves = enabledSensors.map((sensor, sensorIndex) =>
        gcurve({ color: TRACE_COLORS[sensorIndex] }),
      );
      this._curveIndecies = this._curves.map(() => [0]);
    };
    deviceEl.addEventListener('sensor-toggled', sensorToggleActions);
    if (!placeholder)
      setTimeout(() => {
        // give the sensor a change to enable and then catch the current sensor state
        sensorToggleActions();
      });
    return deviceEl;
  }

  /**
   * disconnects all devices and ends the session
   */
  _end() {
    this.started = false;
    [...this.devices].forEach(device => {
      device.disconnect();
    });
  }

  /**
   * resets the graph state
   */
  _resetGraph() {
    if (!this._graph) return;
    this._graph.xtitle = 'Time';
    this._graph.ytitle = '';
    this._graph.scroll = true;
    this._graph.width = 500;
    this._graph.height = 300;
    this._graph.xmin = 0;
    this._graph.xmax = 5;
    this._graph.fast = false;
  }

  /**
   * resets the app state to the default
   */
  _resetState() {
    this.addDeviceButton.text = 'Select a Go Direct Device';
    ['actionButton', 'exitButton', 'sampleSlider', 'sampleLabel'].forEach(elementPointer => {
      if (!this[elementPointer]) return;
      this[elementPointer].remove();
      delete this[elementPointer];
    });

    Array.from(this._metersDivision.children).forEach(meter => meter.remove());
    if (this._curves) this._curves.forEach(curve => curve.remove());
    this._resetGraph();
  }

  /**
   * a function to set the number of samples to collect based on the period and samplesPerSecond
   * @returns {null}
   */
  _setSamplesToCollect() {
    if(this._collectFor < 0) return;
    this._samplesToCollect = Math.floor(this.samplesPerSecond * this._collectFor);
  }

  /**
   * sets up the vernier sections for placing vernier elements
   */
  _setupVenierSections() {
    this._vernierAboveCanvasSection = document.createElement('section');
    this._vernierAboveCanvasSection.id = 'vernier-above-section';
    this._vernierAboveCanvasSection.style.display = 'flex';
    this._vernierAboveCanvasSection.style.flexDirection = 'column';
    this._vernierAboveCanvasSection.style.whiteSpace = 'normal';

    this._vernierBelowCanvasSection = document.createElement('section');
    this._vernierBelowCanvasSection.id = 'vernier-below-section';
    this._vernierBelowCanvasSection.style.display = 'flex';
    this._vernierBelowCanvasSection.style.flexDirection = 'column';
    this._vernierBelowCanvasSection.style.whiteSpace = 'normal';

    this._interactionSection = document.createElement('section');
    this._interactionSection.id = 'vernier-interaction-section';
    this._interactionSection.style.display = 'grid';
    this._interactionSection.style.gridTemplateColumns = 'repeat(auto-fit, 200px)';
    this._interactionSection.style.padding = '8px';
    this._interactionSection.style.gap = '8px';
    this._interactionSection.style.alignItems = 'center';

    this._deviceSection = document.createElement('section');
    this._deviceSection.id = 'vernier-device-section';
    this._deviceSection.style.display = 'grid';
    this._deviceSection.style.gridTemplateColumns = 'repeat(auto-fit, 450px)';

    document.querySelector('.glowscript').prepend(this._vernierAboveCanvasSection);
    document.querySelector('.glowscript').after(this._vernierBelowCanvasSection);

    this._vernierAboveCanvasSection.appendChild(this._interactionSection);
    this._vernierBelowCanvasSection.appendChild(this._deviceSection);
  }

  /**
   * toggles the started state
   */
  _toggleStarted() {
    this.started = !this.started;
  }

  /**
   * verifies which kind of connection, blueooth(ble) or usb
   * @param {"ble"|"usb"} type the type of the connection
   * @returns {boolean}
   */
  _verifyConnection(type = 'ble') {
    if (type === 'ble') return true;
    if (type === 'usb') return false;
    throw new Error('connection must be "ble" for bluetooth or "usb" for a wired connection');
  }

  /**
   * an optional function to set how long the data collection should last
   * @param {number} seconds the length of time in seconds to collect data for
   * @returns {null}
   */
  collectFor(seconds = -1) {
    this._collectFor = seconds;
    if(!this.period) return;
    this._setSamplesToCollect();
  }

  /**
   *
   * @param {OpenOptions} [options] the options passed when calling open()
   */
  open(options = {}) {
    if (typeof options === 'string') options = { connection: options };
    this.isBluetoothConnection = this._verifyConnection(options.connection.toLowerCase());
    if (options.device_to_open) {
      this.declaredDevices = options.device_to_open.split(/, ?/);
      this.devices = this.declaredDevices.map(deviceName =>
        this._createSensorInteraction({ item: { name: deviceName } }, true),
      );
    }
  }

  /**
   * reads current sensor measurements and delivers them in a flat Array in the order of device connection and sensor order on device
   * @returns {Array.<number>}
   */
  read() {
    if (!this.devices) return false;
    if (this._samplesCollected > this._samplesToCollect) {
        this.started = false;
        return null;
    }

    const chartMeasurements = this.devices
      .flatMap(deviceEl => Object.values(deviceEl.chartMeasurements))
      .filter(measurement => ![null, undefined].includes(measurement))
      .map(measurement => measurement.slice(0, this._samplesToCollect+1));

    this.dispatchEvent(
      new CustomEvent('data-read', {
        detail: {
          measurements: chartMeasurements.map(sensorMeasurements =>
            sensorMeasurements.map((measurement, measurementIndex) => [
              this.periodS * measurementIndex,
              measurement,
            ]),
          ),
        },
      }),
    );

    const checkMeasurements = this.devices
      .flatMap(deviceEl => deviceEl.checkMeasurement());
    if(checkMeasurements.some(measurement => [null, undefined].includes(measurement))) return null;

    const readMeasurements = this.devices
      .flatMap(deviceEl => deviceEl.readMeasurement());
    const final = readMeasurements.every(measurement => measurement === null) ? null : readMeasurements;
    if(final) this._samplesCollected++;
    return final
  }

  /**
   *
   * @param {Array.<number|Array.<number>>|SelectOptions} [options] possible settings for sensor selection
   */
   select_sensors(options) {
    this._unsetChannels = [[0]];
    if(Array.isArray(options) && Array.isArray(options[0])) options = { channels: options};
    if(Array.isArray(options) && !Array.isArray(options[0])) options = {channels: [options]};
    if(typeof options === 'number') options = {channels: [[options]]};
    if(options === undefined) options = {channels: this._unsetChannels}

    this.channels = options.channels;
  }

  /**
   * start the session
   * @param {number|StartOptions} [options] either the period, or an object of start options
   */
  start(options = 100) {
    this.period = typeof options === 'number' ? options : options.period ?? 100;
    this.addDeviceButton = button({
      bind: this.addDevice,
      text: 'Select a Go Direct Device',
      id: 'addDevice',
    });
  }

  /**
   * a period based frequency to pass to the rate() function equal to 2x the period
   * @returns {number}
   */
  vp_rate() {
    return (2000 / this.period);
  }

  /**
   * returns the current period
   * @returns {number}
   */
  vp_get_slider_period() {
    return this.period;
  }

  get _collectionButtonText() {
    return this._collectFor > 0 ? `Collect for ${this._collectFor}s` : 'Collect';
  }

  /**
   *
   * @param {VernierCanvasOptions} [options] additional components for controlling and visualizing the data
   */
  vp_vernier_canvas(options = {}) {
    const defaultOptions = {
      buttons: true,
      meters: true,
      slider: true,
      graph: false,
      channel_setup: true,
    };
    options = { ...defaultOptions, ...options };

    if (options.buttons) {
      this.addEventListener('device-connected', () => {
        if (this.actionButton) return;
        this.actionButton = document.createElement('button');
        this.actionButton.style.color = '#00aa00';
        this.actionButton.style.fontSize = '20px';
        this.actionButton.style.padding = '4px 8px';
        this.actionButton.textContent = this._collectionButtonText;
        this.actionButton.addEventListener('click', this._toggleStarted.bind(this));

        this.exitButton = document.createElement('button');
        this.exitButton.style.color = '#aa0000';
        this.exitButton.style.fontSize = '20px';
        this.exitButton.style.padding = '4px 8px';
        this.exitButton.textContent = 'Close';
        this.exitButton.addEventListener('click', this.end);

        this._interactionSection.append(this.actionButton, this.exitButton);
      });
    }
    if (options.meters) {
      this._metersDivision = document.createElement('div');
      this._metersDivision.style.display = 'grid';
      this._metersDivision.style.gap = '8px';
      this._metersDivision.style.padding = '8px';
      this._metersDivision.style.gridTemplateColumns = 'repeat(auto-fit, 25ex)';
      this.addEventListener('device-connected', () => {
        this.addEventListener('device-sensor-toggled', () => {
          Array.from(this._metersDivision.children).forEach?.(meter => meter.remove());
          this.devices.forEach(deviceEl => {
            if (!deviceEl.device.item.sensors) return;
            const enabledSensors = deviceEl.device.item.sensors.filter(sensor => sensor.enabled);
            enabledSensors.forEach(sensor => {
              const meterDiv = document.createElement('div');
              meterDiv.style.display = 'flex';
              meterDiv.style.alignItems = 'center';
              meterDiv.style.gap = '8px';
              const namePart = document.createElement('span');
              const valuePart = document.createElement('span');
              namePart.textContent = `${sensorNameWithUnit(sensor)}: `;
              sensor.on('value-changed', ({ value }) => {
                valuePart.textContent = Math.round(value * 100) / 100;
              });
              meterDiv.appendChild(namePart);
              meterDiv.appendChild(valuePart);
              this._metersDivision.appendChild(meterDiv);
            });
          });
        });
        this._vernierAboveCanvasSection.appendChild(this._metersDivision);
      });
    }
    if (options.slider) {
      this.addEventListener('device-connected', () => {
        if (this.sampleSlider) return;
        this.sampleSlider = document.createElement('input');
        this.sampleSlider.id = 'sample-slider';
        this.sampleSlider.setAttribute('type', 'range');
        this.sampleSlider.value = this.samplesPerSecond;
        this.sampleSlider.setAttribute('min', 1);
        this.sampleSlider.setAttribute('max', 30);
        this.sampleSlider.setAttribute('step', 1);
        this.sampleSlider.addEventListener('input', ({ target: { value } }) => {
          this.samplesPerSecond = value;
        });

        this.sampleLabel = document.createElement('label');
        this.sampleLabel.textContent = `${this.samplesPerSecond} samples/second`;
        this.sampleLabel.setAttribute('for', 'sample-slider');

        this._interactionSection.append(this.sampleSlider);
        this._interactionSection.append(this.sampleLabel);
      });
    }
    if (options.chart) {
      this._graph = graph({
        xtitle: 'Time',
        ytitle: '',
        scroll: true,
        width: 500,
        height: 300,
        xmin: 0,
        xmax: 5,
        fast: false,
      });
      this._curves = [gcurve()];
      this._curves[0].plot(0, 0);
      this._curveIndecies = this._curves.map(() => [0]);
      this.addEventListener('data-read', ({ detail: { measurements } }) => {
        this._curves.forEach((curve, curveIndex) => {
          if(!measurements[curveIndex]) return;
          while (this._curveIndecies[curveIndex] < measurements[curveIndex].length) {
            const measurement = measurements[curveIndex][this._curveIndecies[curveIndex]];
            curve.plot(...measurement);
            this._curveIndecies[curveIndex]++;
          }
        });
      });
    }
    this._skipDeviceControl = !options.channel_setup;
    if (this._skipDeviceControl && this.devices.length)
      Array.from(this._deviceSection.children).forEach(child => child.remove());
  }
}

class VernierDevice extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.resetMeasurements();
  }

  get styles() {
    return /*html*/ `
      <style>
        fieldset {
          display:flex;
          flex-direction:column;
          white-space:normal;
          gap:4px;
        }
        [hidden] {
          display:none;
        }
        [data-sensor-channel] {
          display:flex;
          justify-content: space-between;
        }
        [data-sensor-reading] {
          color: var(--chart-color, 'black')
        }
      </style>
    `;
  }

  get period() {
    return this._period;
  }

  set period(value) {
    this._period = Number(value) || 100;
    this.dispatchEvent(new Event('period-set'));
    this.device.item.stop?.();
    this.deviceStart();
  }

  connectedCallback() {
    this.setAttribute('id', this.device.item.name);
    this.render();
  }

  resetMeasurements() {
    this.chartMeasurements = {};
    this.readMeasurements = {};
  }

  deviceStart() {
    if (!this.device.item.sensors) return;
    this.resetMeasurements();
    const enabledSensors = this.device.item.sensors.filter(deviceSensor => deviceSensor.enabled);
    if (enabledSensors.length) {
      enabledSensors.forEach(sensor => {
        this.chartMeasurements[sensorNameWithUnit(sensor)] =
          this.chartMeasurements?.[sensorNameWithUnit(sensor)]?.slice(-1);
        this.readMeasurements[sensorNameWithUnit(sensor)] =
          this.readMeasurements?.[sensorNameWithUnit(sensor)]?.slice(-1);
      });
      this._reading = true;
      this.device.item.start(this.period);
    }
  }

  stopRead() {
    this._reading = false;
  }

  disconnect() {
    this.dispatchEvent(new Event('disconnected'));
    try {
      this.device.item.stop();
      this.device.item.close();
    } catch (error) {
      console.error(error);
    }
    this.remove();
  }

  readMeasurement() {
    return Object.values(this.readMeasurements).map((deviceReadings=[]) => deviceReadings.shift() ?? null);
  }

  checkMeasurement() {
    return Object.values(this.readMeasurements).map((deviceReadings=[]) => deviceReadings[0] ?? null);
  }

  setupSensors() {
    this.render();
    this.device.item.sensors.forEach(sensor => {
      sensor.on('value-changed', ({ value }) => {
        if (!sensor.enabled) return;
        if(this._reading) {
          if (!this.chartMeasurements[sensorNameWithUnit(sensor)]) {
            this.chartMeasurements[sensorNameWithUnit(sensor)] = [];
            this.readMeasurements[sensorNameWithUnit(sensor)] = [];
          }
          this.chartMeasurements[sensorNameWithUnit(sensor)].push(value);
          this.readMeasurements[sensorNameWithUnit(sensor)].push(value);
        }
        this.shadowRoot.querySelector(
          `[data-sensor-channel="${sensorNameWithUnit(sensor)}"] [data-sensor-reading]`,
        ).textContent = `${Math.round(value * 100) / 100} ${sensor.unit}`;
      });
    });

    const sensorInputs = this.shadowRoot.querySelectorAll('#channels input');
    sensorInputs.forEach(sensorInput => {
      sensorInput.addEventListener('change', () => {
        const sensor = this.device.item.sensors.find(
          deviceSensor => deviceSensor.number === Number(sensorInput.dataset.number),
        );
        sensor.setEnabled(sensorInput.checked);
        this.dispatchEvent(new CustomEvent('sensor-toggled', { detail: this.device }));
        this.device.item.stop();
        this.deviceStart();
        if (!sensor.enabled) {
          delete this.chartMeasurements[sensorNameWithUnit(sensor)];
          delete this.readMeasurements[sensorNameWithUnit(sensor)];
        }
        else {
          this.chartMeasurements[sensorNameWithUnit(sensor)] = [];
          this.readMeasurements[sensorNameWithUnit(sensor)] = [];
        }
      });
    });
  }

  render() {
    this.shadowRoot.innerHTML = /*html*/ `
      ${this.styles}
      <fieldset id='sensor'>
        <legend>${this.device.item.name}</legend>
        <fieldset id='channels'>
          <legend>Channels</legend>
          ${(this.device.item.sensors || [])
            .map(
              sensor => /*html*/ `<div data-sensor-channel="${sensorNameWithUnit(
                sensor,
              )}"><label><input ${sensor.enabled ? 'checked' : ''} type='checkbox'
                data-number="${sensor.number}">${sensorNameWithUnit(
                sensor,
              )}</label><span data-sensor-reading></span></div>`,
            )
            .join('')}
        </fieldset>
      </fieldset>
    `;
  }
}
customElements.define('vernier-device', VernierDevice);

const gdx = new VernierGDX();
export default gdx;
/**
 * @typedef OpenOptions
 * @property {'ble'|'usb'} [connection=usb]
 * @property {string} [device_to_open] setups a device element with expected names for device connections and enforces the order for collection
 */

/**
 * @typedef SelectOptions
 * @property {Array.<number|Array.<number>>} [channels=[[0]]] an array of channel indecies to enable - if multiple devices will be connected, it is an array with each device index having an array of channel indecies to enable.
 */

/**
 * @typedef StartOptions
 * @property {number} [period=10]
 */

/**
 * @typedef VernierCanvasOptions
 * @property {boolean} [buttons=true] collect and close buttons
 * @property {boolean} [meters=true] whether to meter sensors outside collection mode
 * @property {boolean} [slider=true] a slider components to adjust the period
 * @property {boolean} [graph=false] a graph for the collected data
 */
