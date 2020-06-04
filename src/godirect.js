import Device from './Device.js';
import WebBluetoothDeviceAdapter from './WebBluetoothDeviceAdapter.js';
import WebUsbDeviceAdapter from './WebUsbDeviceAdapter.js';

const godirect = {
  /**
  * This returns a Device instance
  * @name createDevice
  * @param {Device} nativeDevice - this will be either a BluetoothDevice or HIDDevice depending on how it was created
  * @param {config} config
  * @returns {Promise} Promise object represents a Device instance
  */
  async createDevice(nativeDevice, { open = true, startMeasurements = true } = {}) {
    let adapter = nativeDevice;

    // If not a go direct adapter then create it based on what was passed in
    if (!adapter.godirectAdapter) {
      if (nativeDevice.gatt) {
        adapter = new WebBluetoothDeviceAdapter(nativeDevice);
      } else if (nativeDevice.collections[0].outputReports[0]) {
        adapter = new WebUsbDeviceAdapter(nativeDevice);
      } else {
        throw new Error(`Device Open Failed [ No matching adapter ]`);
      }
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
  * This invokes the requestDevice method for either navigator.bluetooth or navigator.hid, and returns the selected device as a Device instance.
  * This can only be invoked via a user interaction (e.g. within a click event) otherwise you'll get a security warning.
  * @name selectDevice
  * @param {bool} bluetooth - bluetooth or usb
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
      // UI only alllows one at a time anyways so just grab the first one.
      // eslint-disable-next-line prefer-destructuring
      device = devices[0];
    }

    if (!device) throw new DOMException(`No device selected.`);

    return godirect.createDevice(device);
  },
};

export default godirect;
