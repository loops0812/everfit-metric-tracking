import { Injectable } from '@nestjs/common';
import { DistanceUnit } from 'src/commons/enums/distance-unit.enum';
import { IUnitConverter } from './types/unit-converter.interface';
import {
  NegativeDistanceError,
  UnsupportedDistanceUnitError,
} from 'src/commons/errors';

/**
 * Distance conversion utilities.
 * All conversions go through meters as the base unit.
 */
@Injectable()
export class DistanceConverter implements IUnitConverter<DistanceUnit> {
  private static readonly TO_METERS: Record<DistanceUnit, number> = {
    [DistanceUnit.METER]: 1,
    [DistanceUnit.CENTIMETER]: 0.01,
    [DistanceUnit.INCH]: 0.0254,
    [DistanceUnit.FEET]: 0.3048,
    [DistanceUnit.YARD]: 0.9144,
  };

  toBase(value: number, unit: DistanceUnit): number {
    if (value < 0) {
      throw new NegativeDistanceError();
    }
    const factor = DistanceConverter.TO_METERS[unit];
    if (factor === undefined) {
      throw new UnsupportedDistanceUnitError(unit);
    }
    return value * factor;
  }

  fromBase(baseValue: number, unit: DistanceUnit): number {
    const factor = DistanceConverter.TO_METERS[unit];
    if (factor === undefined) {
      throw new UnsupportedDistanceUnitError(unit);
    }
    return baseValue / factor;
  }

  convert(value: number, fromUnit: DistanceUnit, toUnit: DistanceUnit): number {
    const base = this.toBase(value, fromUnit);
    return this.fromBase(base, toUnit);
  }
}