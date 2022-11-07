export default class Device extends EventEmitter {
    constructor(device: any);
    device: any;
    sensors: any[];
    opened: boolean;
    rollingCounter: number;
    collecting: boolean;
    measurementPeriod: number;
    response: any;
    remainingResponseLength: number;
    defaultSensorsMask: number;
    keepValues: boolean;
    minMeasurementPeriod: number;
    serialNumber: string;
    orderCode: string;
    name: string;
    /**
     * Returns a percentage of battery remaining
     * @name getBatteryLevel
     * @returns {number}
     */
    getBatteryLevel(): number;
    /**
     * Returns the battery charging state. See constants.js for defined charging states
     * @name getChargingState
     * @returns {number}
     */
    getChargingState(): number;
    /**
     * Open the device and get information
     * @name open
     * @param {boolean} autoStart if set to true the device enables default sensors and starts measurements.
     */
    open(autoStart?: boolean): Promise<void>;
    /**
     * Close the device, stop measurements and send the disconnect.
     * @name close
     */
    close(): Promise<any>;
    /**
     * Enable the default sensors specified by the device.
     * @name enableDefaultSensors
     */
    enableDefaultSensors(): void;
    /**
     * Start measurements on the enabled sensors. If no sensors are enabled
     * then enable the default sensors. If a period is specified then use it,
     * if not use the fastest typical from the enabled sensors.
     * @name start
     * @param {number} period
     */
    start(period?: number): void;
    /**
     * Stop measurements on the device.
     * @name stop
     */
    stop(): void;
    /**
     * Based on a number return the sensor.
     * @name getSensor
     * @returns {sensor}
     */
    getSensor(number: any): sensor;
    _connect(): Promise<any>;
    writeQueue: any;
    deviceWriteInterval: NodeJS.Timeout;
    _disconnect(): Promise<any>;
    _init(): Promise<any>;
    _handleResponse(notification: any): void;
    remainingResponseLegnth: number;
    _getSensorsWithMask(channelMask: any): any[];
    _processMeasurements(response: any): void;
    _resolveWriteCommand(command: any, rollingCounter: any, response: any): void;
    _onOpened(): void;
    _onClosed(): void;
    _decRollingCounter(): number;
    _calculateChecksum(buff: any): number;
    _sendCommand(subCommand: any): Promise<any>;
    _writeToDevice(buffer: any): Promise<void>;
    _queueWriteCommand(command: any): Promise<any>;
    _getStatus(): Promise<{
        mainFirmwareVersion: string;
        bleFirmwareVersion: string;
        battery: any;
        chargingStatus: string;
    }>;
    _getAvailableSensors(): Promise<void>;
    availableSensors: any;
    _getDefaultSensorsMask(): Promise<void>;
    _getDeviceInfo(): Promise<void>;
    _getSensorInfo(i: any): Promise<void>;
    _restartMeasurements(): Promise<void>;
    _setMeasurementPeriod(measurementPeriodInMicroseconds: any): Promise<any>;
    _getEnabledChannelMask(): number;
    _startMeasurements(): Promise<void>;
    _stopMeasurements(): Promise<void>;
}
import { EventEmitter } from "./utils.js";
