export default class WebBluetoothDeviceAdapter {
    constructor(webBluetoothNativeDevice: any);
    webBluetoothNativeDevice: any;
    maxPacketLength: number;
    deviceCommand: any;
    deviceResponse: any;
    get godirectAdapter(): boolean;
    writeCommand(commandBuffer: any): Promise<any>;
    setup({ onClosed, onResponse }: {
        onClosed: any;
        onResponse: any;
    }): Promise<void>;
    close(): Promise<any>;
}
