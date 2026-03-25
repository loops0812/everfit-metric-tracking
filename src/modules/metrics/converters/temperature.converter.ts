import { Injectable } from '@nestjs/common';
import { TemperatureUnit } from 'src/commons/enums/temperature-unit.enum';
import { IUnitConverter } from './types/unit-converter.interface';
import { UnsupportedTemperatureUnitError } from 'src/commons/errors';

/**
 * Temperature conversion utilities.
 * All conversions go through Celsius as the base unit.
 */
@Injectable()
export class TemperatureConverter implements IUnitConverter<TemperatureUnit> {
  toBase(value: number, unit: TemperatureUnit): number {
    switch (unit) {
      case TemperatureUnit.CELSIUS:
        return value;
      case TemperatureUnit.FAHRENHEIT:
        return (value - 32) * (5 / 9);
      case TemperatureUnit.KELVIN:
        return value - 273.15;
      default:
        throw new UnsupportedTemperatureUnitError(unit);
    }
  }

  fromBase(baseValue: number, unit: TemperatureUnit): number {
    switch (unit) {
      case TemperatureUnit.CELSIUS:
        return baseValue;
      case TemperatureUnit.FAHRENHEIT:
        return baseValue * (9 / 5) + 32;
      case TemperatureUnit.KELVIN:
        return baseValue + 273.15;
      default:
        throw new UnsupportedTemperatureUnitError(unit);
    }
  }

  convert(
    value: number,
    fromUnit: TemperatureUnit,
    toUnit: TemperatureUnit,
  ): number {
    const base = this.toBase(value, fromUnit);
    return this.fromBase(base, toUnit);
  }
}
