export default class WebUsbDeviceAdapter {
  constructor(webUsbNativeDevice) {
    this.webUsbNativeDevice = webUsbNativeDevice;
    this.onResponse = null;
    this.onClosed = null;
    this.reportId = 0;
    this.maxPacketLength = 63; // standard hid packets are 64 so reserve one for the length
  }

  get godirectAdapter() {
    return true;
  }

  async writeCommand(commandBuffer) {
    // Add the length of the command buffer as first byte
    const tmp = new Uint8Array([commandBuffer.byteLength, ...commandBuffer]);
    return this.webUsbNativeDevice.sendReport(this.reportId, tmp);
  }

  // Todo: bikeshed on name of this function
  async setup({ onClosed, onResponse }) {
    await this.webUsbNativeDevice.open();
    this.onResponse = onResponse;
    this.onClosed = onClosed;
    this.reportId = this.webUsbNativeDevice.collections[0].outputReports[0].reportId;
    this.webUsbNativeDevice.oninputreport = e => {
      // Pull off the length byte before sending it along for processing
      const data = new DataView(e.data.buffer.slice(1));
      this.onResponse(data);
    };
  }

  async close() {
    this.webUsbNativeDevice.close();
    this.onClosed();
  }
}
