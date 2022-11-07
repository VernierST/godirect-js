export default godirect;
declare namespace godirect {
    /**
    * This returns a Device instance
    * @name createDevice
    * @param {Device} nativeDevice - this will be either a BluetoothDevice or HIDDevice depending on how it was created
    * @param {config} config
    * @returns {Promise} Promise object represents a Device instance
    */
    function createDevice(nativeDevice: Device, { open, startMeasurements }?: config): Promise<any>;
    /**
    * This returns a Device instance
    * @name createDevice
    * @param {Device} nativeDevice - this will be either a BluetoothDevice or HIDDevice depending on how it was created
    * @param {config} config
    * @returns {Promise} Promise object represents a Device instance
    */
    function createDevice(nativeDevice: Device, { open, startMeasurements }?: config): Promise<any>;
    /**
    * This invokes the requestDevice method for either navigator.bluetooth or navigator.hid, and returns the selected device as a Device instance.
    * This can only be invoked via a user interaction (e.g. within a click event) otherwise you'll get a security warning.
    * @name selectDevice
    * @param {bool} bluetooth - bluetooth or usb
    * @returns {Promise} Promise object represents a Device instance
    */
    function selectDevice(bluetooth?: bool): Promise<any>;
    /**
    * This invokes the requestDevice method for either navigator.bluetooth or navigator.hid, and returns the selected device as a Device instance.
    * This can only be invoked via a user interaction (e.g. within a click event) otherwise you'll get a security warning.
    * @name selectDevice
    * @param {bool} bluetooth - bluetooth or usb
    * @returns {Promise} Promise object represents a Device instance
    */
    function selectDevice(bluetooth?: bool): Promise<any>;
}
import Device from "./Device.js";
