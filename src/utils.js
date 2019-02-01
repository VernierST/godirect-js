const verboseLogging = false;

const isFunction = (obj) => {
  return typeof obj === 'function' || false;
};

export const nonZero = x => (x !== (undefined || null || '' || 0));

export class EventEmitter {
  constructor() {
    this._listenerMap = new Map();
  }

  on(name, callback) {
    if (!this._listenerMap.has(name)) {
      this._listenerMap.set(name, []);
    }

    this._listenerMap.get(name).push(callback);
  }

  off(name, callback) {
    const listeners = this._listenerMap.get(name);

    if (listeners && listeners.length) {
      const index = listeners.reduce((i, listener, index) => {
        const item = (isFunction(listener) && listener === callback) ? i = index : i;
        return item;
      }, -1);

      if (index > -1) {
        listeners.splice(index, 1);
        this._listenerMap.set(name, listeners);
        return true;
      }
    }

    return false;
  }

  unbind() {
    this._listenerMap.clear();
  }

  emit(name, ...args) {
    const listeners = this._listenerMap.get(name);

    if (listeners && listeners.length) {
      listeners.forEach((listener) => {
        listener(...args);
      });
      return true;
    }

    return false;
  }
}


export const log = (function log() {
  if (!verboseLogging) {
    return function noop() {};
  }
  const context = 'GODIRECT:';
  return Function.prototype.bind.call(console.log, console, context);
}());

export const dir = (function dir() {
  if (!verboseLogging) {
    return function noop() {};
  }
  return Function.prototype.bind.call(console.dir, console);
}());

export function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
}


export function appendBuffer(buffer1, buffer2) {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
}
