
export default class WebUsbDeviceAdapter {
  constructor(webUsbNativeDevice) {
    this.webUsbNativeDevice = webUsbNativeDevice;
    this.onResponse = null;
    this.onClosed = null;
    this.maxPacketLength = 64;
  }

  get godirectAdapter () {
    return true;
  }

  async writeCommand(commandBuffer) {
    const tmp = new Uint8Array([commandBuffer.byteLength, ...commandBuffer]);
    const { reportId } = this.webUsbNativeDevice.collections[0].outputReports[0];
    return this.webUsbNativeDevice.sendReport(reportId, tmp);
  }

  // Todo: bikeshed on name of this function
  async setup({ onClosed, onResponse }) {
    await this.webUsbNativeDevice.open();
    this.onResponse = onResponse;
    this.onClosed = onClosed;
    this.webUsbNativeDevice.oninputreport = (e) => {
      // Pull off the length byte before sending it along for processing.
      const data = new DataView(e.data.buffer.slice(1));
      this.onResponse(data);
    };
  }

  async close() {
    this.webUsbNativeDevice.close();
    this.onClosed();
  }
}
