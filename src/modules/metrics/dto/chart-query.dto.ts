import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricType } from 'src/commons/enums/metric-type.enum';
import { DistanceUnit } from 'src/commons/enums/distance-unit.enum';
import { TemperatureUnit } from 'src/commons/enums/temperature-unit.enum';

const ALL_UNITS = [
  ...Object.values(DistanceUnit),
  ...Object.values(TemperatureUnit),
];

export class ChartQueryDto {
  @ApiProperty({ example: 'user-1' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: MetricType, example: MetricType.DISTANCE })
  @IsEnum(MetricType)
  type: MetricType;

  @ApiProperty({
    example: '1m',
    description: 'Period filter: 1w (1 week), 2w, 1m (1 month), 3m, 6m, 1y',
  })
  @IsString()
  @Matches(/^\d+(w|m|y)$/, {
    message: 'Period must match format: <number><w|m|y> (e.g. 1w, 1m, 3m, 1y)',
  })
  period: string;

  @ApiPropertyOptional({
    enum: ALL_UNITS,
    example: 'meter',
    description:
      'Target unit for conversion. If omitted, returns base unit values.',
  })
  @IsOptional()
  @IsString()
  unit?: string;
}
