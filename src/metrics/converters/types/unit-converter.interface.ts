/**
 * Generic interface for unit converters.
 * All metric types (distance, temperature, etc.) implement this contract.
 */
export interface IUnitConverter<TUnit> {
  /**
   * 
   * @param value 
   * @param unit 
   * @return The value converted to the base unit (e.g., meters for distance, Celsius for temperature).
   */
  toBase(value: number, unit: TUnit): number;
  /**
   * 
   * @param baseValue 
   * @param unit 
   * @return The value converted from the base unit to the specified unit.
   */
  fromBase(baseValue: number, unit: TUnit): number;
  /**
   * 
   * @param value 
   * @param fromUnit 
   * @param toUnit 
   * @return The value converted from one unit to another.
   */
  convert(value: number, fromUnit: TUnit, toUnit: TUnit): number;
}
