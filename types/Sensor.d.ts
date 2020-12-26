export class MeasurementInfo {
    constructor(args?: {});
    type: any;
    mode: any;
    minValue: any;
    maxValue: any;
    uncertainty: any;
    minPeriod: any;
    maxPeriod: any;
    typicalPeriod: any;
    granularity: any;
}
export class SensorSpecs {
    constructor(args?: {});
    number: any;
    name: any;
    unit: any;
    id: any;
    mutalExclusionMask: any;
    measurementInfo: any;
}
export class Sensor extends EventEmitter {
    constructor(specs: any);
    number: any;
    name: any;
    unit: any;
    specs: any;
    enabled: boolean;
    values: any[];
    value: number;
    /**
    * Clear out the accumulated values
    * @name clear
    */
    clear(): void;
    /**
    * Set the latest value and tell people about it.
    * @name setValue
    * @param {number} value
    * @param {boolean} keep
    */
    setValue(value: number, keep: boolean): void;
    /**
    * Enable the sensor and tell people about it.
    * @name setEnabled
    * @param {boolean} enabled
    */
    setEnabled(enabled: boolean): void;
}
import { EventEmitter } from "./utils.js";
