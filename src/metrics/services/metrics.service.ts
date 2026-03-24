import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Metric, MetricDocument } from '../schemas/metric.schema';
import { CreateMetricDto } from '../dto';
import { MetricType } from 'src/commons/enums/metric-type.enum';
import { DistanceUnit } from 'src/commons/enums/distance-unit.enum';
import { TemperatureUnit } from 'src/commons/enums/temperature-unit.enum';
import type { IUnitConverter } from '../converters/types/unit-converter.interface';
import { IMetricsService } from '../interfaces/metrics-service.interface';
import { DISTANCE_CONVERTER, TEMPERATURE_CONVERTER } from '../converters/converter.tokens';

const DISTANCE_UNITS = Object.values(DistanceUnit) as string[];
const TEMPERATURE_UNITS = Object.values(TemperatureUnit) as string[];

@Injectable()
export class MetricsService implements IMetricsService {
  private readonly converters: Record<MetricType, IUnitConverter<any>>;

  constructor(
    @InjectModel(Metric.name) private metricModel: Model<MetricDocument>,
    @Inject(DISTANCE_CONVERTER) distanceConverter: IUnitConverter<DistanceUnit>,
    @Inject(TEMPERATURE_CONVERTER) temperatureConverter: IUnitConverter<TemperatureUnit>,
  ) {
    this.converters = {
      [MetricType.DISTANCE]: distanceConverter,
      [MetricType.TEMPERATURE]: temperatureConverter,
    };
  }

  async create(dto: CreateMetricDto): Promise<Metric> {
    this.validateUnit(dto.type, dto.unit);

    const converter = this.converters[dto.type];
    const baseValue = converter.toBase(dto.value, dto.unit);

    return this.metricModel.create({
      userId: dto.userId,
      type: dto.type,
      value: dto.value,
      unit: dto.unit,
      baseValue,
      date: new Date(dto.date),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  private getValidUnits(type: MetricType): string[] {
    return type === MetricType.DISTANCE ? DISTANCE_UNITS : TEMPERATURE_UNITS;
  }

  private validateUnit(type: MetricType, unit: string): void {
    const valid = this.getValidUnits(type);
    if (!valid.includes(unit)) {
      throw new BadRequestException(`Invalid unit '${unit}' for metric type '${type}'. Valid units: ${valid.join(', ')}`);
    }
  }
}
