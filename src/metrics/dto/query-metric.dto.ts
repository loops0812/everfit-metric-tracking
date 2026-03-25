import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MetricType } from 'src/commons/enums/metric-type.enum';
import { DistanceUnit } from 'src/commons/enums/distance-unit.enum';
import { TemperatureUnit } from 'src/commons/enums/temperature-unit.enum';

const ALL_UNITS = [...Object.values(DistanceUnit), ...Object.values(TemperatureUnit)];

export class QueryMetricDto {
  @ApiProperty({ example: 'user-1' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: MetricType, example: MetricType.DISTANCE })
  @IsEnum(MetricType)
  type: MetricType;

  @ApiPropertyOptional({
    enum: ALL_UNITS,
    example: 'meter',
    description: 'Target unit for conversion. If omitted, returns values in original unit.',
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
