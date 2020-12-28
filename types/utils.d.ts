export function bufferToHex(buffer: any): string;
export function appendBuffer(buffer1: any, buffer2: any): ArrayBufferLike;
export function nonZero(x: any): boolean;
export class EventEmitter {
    _listenerMap: Map<any, any>;
    on(name: any, callback: any): void;
    off(name: any, callback: any): boolean;
    unbind(): void;
    emit(name: any, ...args: any[]): boolean;
}
export const log: any;
export const dir: any;
