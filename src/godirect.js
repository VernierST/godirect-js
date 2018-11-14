import Device from './Device.js';

const godirect = {
  /**
  * This returns a Device instance
  * @name createDevice
  * @param {BluetoothDevice} bleDevice
  * @param {config} config
  * @returns {Promise} Promise object represents a Device instance
  */
  async createDevice(bleDevice, config = { open: true }) {
    const device = new Device(bleDevice);

    if (config.open) {
      try {
        await device.open(true);
      } catch (err) {
        console.error(err);
        throw err;
      }
    }

    return device;
  },

  /**
  * This invokes the navigator.bluetooth.requestDevice method and returns the selected device as a Device instance.
  * This can only be invoked via a user interaction (e.g. within a click event) otherwise you'll get a security warning.
  * @name selectDevice
  * @returns {Promise} Promise object represents a Device instance
  */
  async selectDevice() {
    if (!navigator.bluetooth) {
      return Promise.reject(new Error('No Web Bluetooth support.'));
    }

    const bleDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'GDX' }],
      optionalServices: ['d91714ef-28b9-4f91-ba16-f0d9a604f112']
    });

    return godirect.createDevice(bleDevice);
  }
};

if (!window.godirect) {
  window.godirect = godirect;
}

export default godirect;
