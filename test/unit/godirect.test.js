import godirect from '../../src/godirect.js';

describe('godirect API', () => {
  it('createDevice is defined', async () => {
    expect(godirect.createDevice).toBeDefined();
  });

  it('selectDevice is defined', () => {
    expect(godirect.selectDevice).toBeDefined();
  });
});

describe('createDevice', () => {
  const testBleDeviceAdapter = {
    godirectAdapter: true,
    async setup() { return true; },
    async close() { return true; },
    async writeCommand() { return true; }
  };

  it('returns a Device object', async () => {
    const device = await godirect.createDevice(testBleDeviceAdapter, {
      open: false,
      startMeasurements: false
    });

    expect(device).toMatchObject({
      device: { ...testBleDeviceAdapter },
      sensors: [],
      opened: false,
      rollingCounter: 0,
      collecting: false,
      measurementPeriod: 10,
      response: null,
      remainingResponseLength: 0,
      defaultSensorsMask: 0,
      keepValues: true,
      minMeasurementPeriod: 10
    });
  });
});
