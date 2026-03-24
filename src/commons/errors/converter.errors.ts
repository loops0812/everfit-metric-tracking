import { CONVERTER_ERRORS } from './error-messages';

export class NegativeDistanceError extends Error {
  constructor() {
    super(CONVERTER_ERRORS.NEGATIVE_DISTANCE);
    this.name = 'NegativeDistanceError';
  }
}

export class UnsupportedDistanceUnitError extends Error {
  constructor(unit: string) {
    super(CONVERTER_ERRORS.UNSUPPORTED_DISTANCE_UNIT(unit));
    this.name = 'UnsupportedDistanceUnitError';
  }
}

export class UnsupportedTemperatureUnitError extends Error {
  constructor(unit: string) {
    super(CONVERTER_ERRORS.UNSUPPORTED_TEMPERATURE_UNIT(unit));
    this.name = 'UnsupportedTemperatureUnitError';
  }
}
