import { EventEmitter } from './utils.js';

export class MeasurementInfo {
  constructor(args = {}) {
    this.type = args.type; // 0 = Real64 or 1 = Int32
    this.mode = args.mode; // 0 = Periodic, 1 = APeriodic
    this.minValue = args.minValue; // sensor units
    this.maxValue = args.maxValue; // sensor units
    this.uncertainty = args.uncertainty; // sensor units
    this.minPeriod = args.minPeriod; // milliseconds
    this.maxPeriod = args.maxPeriod; // milliseconds
    this.typicalPeriod = args.typicalPeriod; // milliseconds
    this.granularity = args.granularity; // milliseconds
  }
}

export class SensorSpecs {
  constructor(args = {}) {
    this.number = args.number;
    this.name = args.name;
    this.unit = args.unit;
    this.id = args.id;
    this.mutalExclusionMask = args.mutalExclusionMask;
    this.measurementInfo = args.measurementInfo;
  }
}

export class Sensor extends EventEmitter {
  constructor(specs) {
    super();
    this.number = specs.number;
    this.name = specs.name;
    this.unit = specs.unit;
    this.specs = specs;
    this.enabled = false;
    this.values = [];
    this.value = null;
  }

  /**
  * Clear out the accumulated values
  * @name clear
  */
  clear() {
    this.value = null;
    this.values = [];
  }

  /**
  * Set the latest value and tell people about it.
  * @name setValue
  * @param {number} value
  * @param {boolean} keep
  */
  setValue(value, keep) {
    this.value = value; // latest
    if (keep) {
      this.values.push(this.value);
    }
    this.emit('value-changed', this);
  }

  /**
  * Enable the sensor and tell people about it.
  * @name setEnabled
  * @param {boolean} enabled
  */
  setEnabled(enabled) {
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      this.emit('state-changed', this);
    }
  }
}
