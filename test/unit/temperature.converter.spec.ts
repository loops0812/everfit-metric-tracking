import { TemperatureConverter } from '../../src/metrics/converters/temperature.converter';
import { TemperatureUnit } from '../../src/commons/enums/temperature-unit.enum';
import {
  CONVERTER_ERRORS,
  UnsupportedTemperatureUnitError,
} from '../../src/commons/errors';

const converter = new TemperatureConverter();

describe('TemperatureConverter', () => {
  describe('toBase (→ °C)', () => {
    it('should return same value for Celsius', () => {
      expect(converter.toBase(100, TemperatureUnit.CELSIUS)).toBe(100);
    });

    it('should convert 32°F to 0°C (freezing point)', () => {
      expect(converter.toBase(32, TemperatureUnit.FAHRENHEIT)).toBeCloseTo(0, 6);
    });

    it('should convert 212°F to 100°C (boiling point)', () => {
      expect(converter.toBase(212, TemperatureUnit.FAHRENHEIT)).toBeCloseTo(100, 6);
    });

    it('should convert 273.15K to 0°C', () => {
      expect(converter.toBase(273.15, TemperatureUnit.KELVIN)).toBeCloseTo(0, 6);
    });

    it('should convert 0K to -273.15°C (absolute zero)', () => {
      expect(converter.toBase(0, TemperatureUnit.KELVIN)).toBeCloseTo(-273.15, 6);
    });

    it('should convert 373.15K to 100°C', () => {
      expect(converter.toBase(373.15, TemperatureUnit.KELVIN)).toBeCloseTo(100, 6);
    });
  });

  describe('fromBase (°C →)', () => {
    it('should convert 0°C to 32°F', () => {
      expect(converter.fromBase(0, TemperatureUnit.FAHRENHEIT)).toBeCloseTo(32, 6);
    });

    it('should convert 100°C to 212°F', () => {
      expect(converter.fromBase(100, TemperatureUnit.FAHRENHEIT)).toBeCloseTo(212, 6);
    });

    it('should convert 0°C to 273.15K', () => {
      expect(converter.fromBase(0, TemperatureUnit.KELVIN)).toBeCloseTo(273.15, 6);
    });

    it('should convert 100°C to 373.15K', () => {
      expect(converter.fromBase(100, TemperatureUnit.KELVIN)).toBeCloseTo(373.15, 6);
    });
  });

  describe('convert (cross-unit)', () => {
    it('should convert 32°F to 273.15K', () => {
      expect(
        converter.convert(32, TemperatureUnit.FAHRENHEIT, TemperatureUnit.KELVIN),
      ).toBeCloseTo(273.15, 4);
    });

    it('should convert 0K to -459.67°F (absolute zero)', () => {
      expect(
        converter.convert(0, TemperatureUnit.KELVIN, TemperatureUnit.FAHRENHEIT),
      ).toBeCloseTo(-459.67, 2);
    });

    it('should be idempotent for same unit', () => {
      expect(
        converter.convert(37, TemperatureUnit.CELSIUS, TemperatureUnit.CELSIUS),
      ).toBe(37);
    });

    it('should handle negative Fahrenheit', () => {
      expect(
        converter.convert(-40, TemperatureUnit.FAHRENHEIT, TemperatureUnit.CELSIUS),
      ).toBeCloseTo(-40, 6); // -40°F = -40°C
    });

    it('should round-trip correctly (°C → °F → °C)', () => {
      const original = 36.6;
      const fahrenheit = converter.convert(original, TemperatureUnit.CELSIUS, TemperatureUnit.FAHRENHEIT);
      const backToCelsius = converter.convert(fahrenheit, TemperatureUnit.FAHRENHEIT, TemperatureUnit.CELSIUS);
      expect(backToCelsius).toBeCloseTo(original, 6);
    });
  });

  describe('error handling', () => {
    it('should throw UnsupportedTemperatureUnitError for invalid unit', () => {
      expect(() => converter.toBase(1, 'Rankine' as TemperatureUnit)).toThrow(
        UnsupportedTemperatureUnitError,
      );
      expect(() => converter.toBase(1, 'Rankine' as TemperatureUnit)).toThrow(
        CONVERTER_ERRORS.UNSUPPORTED_TEMPERATURE_UNIT('Rankine'),
      );
    });
  });
});
