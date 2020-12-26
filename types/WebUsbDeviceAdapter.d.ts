export default class WebUsbDeviceAdapter {
    constructor(webUsbNativeDevice: any);
    webUsbNativeDevice: any;
    onResponse: any;
    onClosed: any;
    reportId: number;
    maxPacketLength: number;
    get godirectAdapter(): boolean;
    writeCommand(commandBuffer: any): Promise<any>;
    setup({ onClosed, onResponse }: {
        onClosed: any;
        onResponse: any;
    }): Promise<void>;
    close(): Promise<void>;
}
