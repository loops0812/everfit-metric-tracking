export const CONVERTER_ERRORS = {
  NEGATIVE_DISTANCE: 'Distance value cannot be negative',
  UNSUPPORTED_DISTANCE_UNIT: (unit: string) =>
    `Unsupported distance unit: ${unit}`,
  UNSUPPORTED_TEMPERATURE_UNIT: (unit: string) =>
    `Unsupported temperature unit: ${unit}`,
} as const;
