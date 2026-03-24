import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MetricType } from 'src/commons/enums/metric-type.enum';
import { DistanceUnit } from 'src/commons/enums/distance-unit.enum';
import { TemperatureUnit } from 'src/commons/enums/temperature-unit.enum';

const DISTANCE_UNITS = Object.values(DistanceUnit);
const TEMPERATURE_UNITS = Object.values(TemperatureUnit);
const ALL_UNITS = [...DISTANCE_UNITS, ...TEMPERATURE_UNITS];

export class CreateMetricDto {
  @ApiProperty({ example: 'user-1' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: MetricType, example: MetricType.DISTANCE })
  @IsEnum(MetricType)
  type: MetricType;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @ValidateIf((o) => o.type === MetricType.DISTANCE)
  @Min(0, { message: 'Value must be non-negative for distance metrics' })
  value: number;

  @ApiProperty({
    enum: ALL_UNITS,
    example: 'meter',
    description: 'Distance: meter, centimeter, inch, feet, yard | Temperature: C, F, K',
  })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ example: '2025-03-24T00:00:00.000Z' })
  @IsDateString()
  date: string;
}
