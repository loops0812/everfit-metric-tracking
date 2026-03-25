import { DistanceConverter } from '../../src/modules/metrics/converters/distance.converter';
import { DistanceUnit } from '../../src/commons/enums/distance-unit.enum';
import {
  CONVERTER_ERRORS,
  NegativeDistanceError,
  UnsupportedDistanceUnitError,
} from '../../src/commons/errors';

const converter = new DistanceConverter();

describe('DistanceConverter', () => {
  describe('toBase (→ meters)', () => {
    it('should return same value for meters', () => {
      expect(converter.toBase(100, DistanceUnit.METER)).toBe(100);
    });

    it('should convert centimeters to meters', () => {
      expect(converter.toBase(100, DistanceUnit.CENTIMETER)).toBe(1);
    });

    it('should convert inches to meters', () => {
      expect(converter.toBase(1, DistanceUnit.INCH)).toBeCloseTo(0.0254, 6);
    });

    it('should convert feet to meters', () => {
      expect(converter.toBase(1, DistanceUnit.FEET)).toBeCloseTo(0.3048, 6);
    });

    it('should convert yards to meters', () => {
      expect(converter.toBase(1, DistanceUnit.YARD)).toBeCloseTo(0.9144, 6);
    });

    it('should handle zero', () => {
      expect(converter.toBase(0, DistanceUnit.FEET)).toBe(0);
    });

    it('should throw for negative values', () => {
      expect(() => converter.toBase(-5, DistanceUnit.METER)).toThrow(
        NegativeDistanceError,
      );
      expect(() => converter.toBase(-1, DistanceUnit.METER)).toThrow(
        CONVERTER_ERRORS.NEGATIVE_DISTANCE,
      );
    });
  });

  describe('fromBase (meters →)', () => {
    it('should convert meters to centimeters', () => {
      expect(converter.fromBase(1, DistanceUnit.CENTIMETER)).toBe(100);
    });

    it('should convert meters to inches', () => {
      expect(converter.fromBase(0.0254, DistanceUnit.INCH)).toBeCloseTo(1, 6);
    });

    it('should convert meters to feet', () => {
      expect(converter.fromBase(0.3048, DistanceUnit.FEET)).toBeCloseTo(1, 6);
    });

    it('should convert meters to yards', () => {
      expect(converter.fromBase(0.9144, DistanceUnit.YARD)).toBeCloseTo(1, 6);
    });
  });

  describe('convert (cross-unit)', () => {
    it('should convert feet to inches (1 foot = 12 inches)', () => {
      expect(
        converter.convert(1, DistanceUnit.FEET, DistanceUnit.INCH),
      ).toBeCloseTo(12, 4);
    });

    it('should convert yards to feet (1 yard = 3 feet)', () => {
      expect(
        converter.convert(1, DistanceUnit.YARD, DistanceUnit.FEET),
      ).toBeCloseTo(3, 4);
    });

    it('should convert 100cm to 1 meter', () => {
      expect(
        converter.convert(100, DistanceUnit.CENTIMETER, DistanceUnit.METER),
      ).toBeCloseTo(1, 6);
    });

    it('should be idempotent for same unit', () => {
      expect(
        converter.convert(42, DistanceUnit.METER, DistanceUnit.METER),
      ).toBe(42);
    });

    it('should handle large values', () => {
      expect(
        converter.convert(1000000, DistanceUnit.CENTIMETER, DistanceUnit.METER),
      ).toBeCloseTo(10000, 4);
    });
  });

  describe('error handling', () => {
    it('should throw UnsupportedDistanceUnitError for invalid unit', () => {
      expect(() => converter.toBase(1, 'lightyear' as DistanceUnit)).toThrow(
        UnsupportedDistanceUnitError,
      );
      expect(() => converter.toBase(1, 'lightyear' as DistanceUnit)).toThrow(
        CONVERTER_ERRORS.UNSUPPORTED_DISTANCE_UNIT('lightyear'),
      );
    });
  });
});
