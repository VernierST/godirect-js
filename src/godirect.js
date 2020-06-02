import Device from './Device.js';
import WebBluetoothDeviceAdapter from './WebBluetoothDeviceAdapter.js';
import WebUsbDeviceAdapter from './WebUsbDeviceAdapter.js';

const godirect = {
  /**
  * This returns a Device instance
  * @name createDevice
  * @param {BluetoothDevice} bleDevice
  * @param {config} config
  * @returns {Promise} Promise object represents a Device instance
  */
  async createDevice(baseDevice, { open = true, startMeasurements = true, bluetooth = true } = {}) {
    let adapter = baseDevice;

    // If not a go direct adapter, assume a web bluetooth device
    if (!adapter.godirectAdapter) {
      adapter = bluetooth ? new WebBluetoothDeviceAdapter(baseDevice) : new WebUsbDeviceAdapter(baseDevice);
    }

    const device = new Device(adapter);

    if (open) {
      try {
        await device.open(startMeasurements);
      } catch (err) {
        console.error(err);
        throw new Error(`Device Open Failed [${err}]`);
      }
    }

    return device;
  },

  /**
  * This invokes the navigator.bluetooth.requestDevice method and returns the selected device as a Device instance.
  * This can only be invoked via a user interaction (e.g. within a click event) otherwise you'll get a security warning.
  * @name selectDevice
  * @param {bool} bluetooth
  * @returns {Promise} Promise object represents a Device instance
  */
  async selectDevice(bluetooth = true) {
    let device;

    if (bluetooth) {
      if (!navigator.bluetooth) {
        return Promise.reject(new Error('No Web Bluetooth support.'));
      }

      device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'GDX' }],
        optionalServices: ['d91714ef-28b9-4f91-ba16-f0d9a604f112']
      });
    } else {
      if (!navigator.hid) {
        return Promise.reject(new Error('No Web HID support.'));
      }
      const devices = await navigator.hid.requestDevice({
        filters:
        [
          {
            vendorId: 0x08f7,
            productId: 0x0010
          },
        ]
      });
      // eslint-disable-next-line prefer-destructuring
      device = devices[0];
    }

    return godirect.createDevice(device, { bluetooth });
  },
};

export default godirect;
