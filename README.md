# GODIRECT JS - Vernier Go Direct® Sensor Library

[![Build Status](https://travis-ci.org/VernierST/godirect-js.svg?branch=main)](https://travis-ci.org/VernierST/godirect-js) [![Dependabot](https://flat.badgen.net/dependabot/vernierst/godirect-js/?icon=dependabot)](https://flat.badgen.net/dependabot/vernierst/godirect-js/?icon=dependabot)

A JavaScript library to easily interact with [Vernier Go Direct® Sensors](https://www.vernier.com/products/sensors/go-direct-sensors).

## Requirements

This library is currently only implemented using [WebBluetooth](https://webbluetoothcg.github.io/web-bluetooth/) and [WebHID](https://wicg.github.io/webhid/) both of which have limited browser support

Partial WebHID functionality is available in Chrome 78 behind a flag on desktop OSes. You will need to enable the "Experimental Web Platform Features" flag (chrome://flags/#enable-experimental-web-platform-features) and restart Chrome.

## Installation

Use the unpkg module version of library in your HTML document:
```html
<script src="https://unpkg.com/@vernier/godirect/dist/godirect.min.umd.js"></script>
```

Use the library as a JavaScript module:

1. Install the module via npm:

```
$ npm i @vernier/godirect
```

2. Import the module into your JavaScript file:
```javascript
import godirect from './node_modules/@vernier/godirect/dist/godirect.min.esm.js';
```

## Example Usage

### HTML
A user action is required to open the BLE device list in the browser (e.g. a user click event from a button). Create a button to initiate the request.
```html
<button id="select_device">Select Go Direct Device</button>
```

### JavaScript
Listen for the button click event.
```javascript
const selectDeviceBtn = document.querySelector('#select_device');

selectDeviceBtn.addEventListener('click', async () => {
  // All following code will go here.
});

```

 Open the browsers device list chooser. This call returns your selected device back. We'll assign the selected device to a constant called `device`;

**`NOTE:` you cannot invoke `godirect.selectDevice()` outside of a user interaction, like a click event. This is part of the browser security model.**
```javascript
// opens the browser list of ble devices matching to GDX
const device = await godirect.selectDevice();

// Get a filtered array of only the enabled sensor(s).
const enabledSensors = device.sensors.filter(s => s.enabled);

// Loop through the array of `enabledSensors` and log the value changes.
enabledSensors.forEach(sensor => {
  sensor.on('value-changed', (sensor) => {
    // log the sensor name, new value, and units.
    console.log(`Sensor: ${sensor.name} value: ${sensor.value} units: ${sensor.unit}`);
  });
});
```

See this example and others (including our Python versions) at our examples repository: [https://github.com/VernierST/godirect-examples](https://github.com/VernierST/godirect-examples) or visit the [live demos](https://vernierst.github.io/godirect-examples/javascript/)


## License

BSD 3-Clause License.

Vernier products are designed for educational use. Our products are not designed nor are they recommended for any industrial, medical, or commercial process such as life support, patient diagnosis, control of a manufacturing process, or industrial testing of any kind.
