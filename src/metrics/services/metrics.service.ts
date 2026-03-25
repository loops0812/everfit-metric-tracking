import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { Metric } from '../schemas/metric.schema';
import { CreateMetricDto, QueryMetricDto, ChartQueryDto } from '../dto';
import { MetricType } from 'src/commons/enums/metric-type.enum';
import { DistanceUnit } from 'src/commons/enums/distance-unit.enum';
import { TemperatureUnit } from 'src/commons/enums/temperature-unit.enum';
import type { IUnitConverter } from '../converters/types/unit-converter.interface';
import type { IMetricsRepository } from '../interfaces/metrics-repository.interface';
import {
  IMetricsService,
  MetricResult,
  PaginatedResult,
  ChartResult,
} from '../interfaces/metrics-service.interface';
import {
  DISTANCE_CONVERTER,
  TEMPERATURE_CONVERTER,
} from '../converters/converter.tokens';
import { METRICS_REPOSITORY } from '../interfaces/metrics-repository.interface';

const DISTANCE_UNITS = Object.values(DistanceUnit) as string[];
const TEMPERATURE_UNITS = Object.values(TemperatureUnit) as string[];

@Injectable()
export class MetricsService implements IMetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly converters: Record<MetricType, IUnitConverter<any>>;

  constructor(
    @Inject(METRICS_REPOSITORY)
    private readonly metricsRepository: IMetricsRepository,
    @Inject(DISTANCE_CONVERTER) distanceConverter: IUnitConverter<DistanceUnit>,
    @Inject(TEMPERATURE_CONVERTER)
    temperatureConverter: IUnitConverter<TemperatureUnit>,
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

    const metric = await this.metricsRepository.create({
      userId: dto.userId,
      type: dto.type,
      value: dto.value,
      unit: dto.unit,
      baseValue,
      date: new Date(dto.date),
    });

    this.logger.log(
      `Created ${dto.type} metric for user=${dto.userId}: ${dto.value} ${dto.unit} (base=${baseValue})`,
    );

    return metric;
  }

  async findAll(query: QueryMetricDto): Promise<PaginatedResult<MetricResult>> {
    const { userId, type, unit, page = 1, limit = 20 } = query;

    if (unit) {
      this.validateUnit(type, unit);
    }

    const skip = (page - 1) * limit;
    const { data: metrics, total } =
      await this.metricsRepository.findWithCount({ userId, type }, skip, limit);

    this.logger.log(
      `Listed ${type} metrics for user=${userId}: ${metrics.length}/${total} (page=${page}, limit=${limit})`,
    );

    const converter = this.converters[type];
    const data: MetricResult[] = metrics.map((m) =>
      this.toMetricResult(m, converter, unit),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getChartData(query: ChartQueryDto): Promise<ChartResult> {
    const { userId, type, period, unit } = query;

    if (unit) {
      this.validateUnit(type, unit);
    }

    const from = this.parsePeriodStart(period);
    const to = new Date();

    const results = await this.metricsRepository.aggregateLatestPerDay(
      userId,
      type,
      from,
      to,
    );

    this.logger.log(
      `Chart data for user=${userId}, type=${type}, period=${period}: ${results.length} data points`,
    );

    const converter = this.converters[type];
    const baseUnit =
      type === MetricType.DISTANCE
        ? DistanceUnit.METER
        : TemperatureUnit.CELSIUS;
    const targetUnit = unit ?? baseUnit;

    const dataPoints = results.map((r) => ({
      date: r.date,
      value: converter.fromBase(r.baseValue, targetUnit),
    }));

    return {
      userId,
      type,
      unit: targetUnit,
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      dataPoints,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────

  private parsePeriodStart(period: string): Date {
    const match = period.match(/^(\d+)(w|m|y)$/);
    if (!match) {
      throw new BadRequestException(`Invalid period format: ${period}`);
    }

    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const now = new Date();

    switch (unit) {
      case 'w':
        now.setDate(now.getDate() - amount * 7);
        break;
      case 'm':
        now.setMonth(now.getMonth() - amount);
        break;
      case 'y':
        now.setFullYear(now.getFullYear() - amount);
        break;
    }

    return now;
  }

  private toMetricResult(
    metric: Metric & { createdAt?: Date },
    converter: IUnitConverter<any>,
    targetUnit?: string,
  ): MetricResult {
    if (targetUnit) {
      return {
        userId: metric.userId,
        type: metric.type,
        value: converter.fromBase(metric.baseValue, targetUnit),
        unit: targetUnit,
        date: metric.date,
        createdAt: metric.createdAt,
      };
    }

    return {
      userId: metric.userId,
      type: metric.type,
      value: metric.value,
      unit: metric.unit,
      date: metric.date,
      createdAt: metric.createdAt,
    };
  }

  private getValidUnits(type: MetricType): string[] {
    return type === MetricType.DISTANCE ? DISTANCE_UNITS : TEMPERATURE_UNITS;
  }

  private validateUnit(type: MetricType, unit: string): void {
    const valid = this.getValidUnits(type);
    if (!valid.includes(unit)) {
      this.logger.warn(
        `Invalid unit '${unit}' for type '${type}'. Valid: ${valid.join(', ')}`,
      );
      throw new BadRequestException(
        `Invalid unit '${unit}' for metric type '${type}'. Valid units: ${valid.join(', ')}`,
      );
    }
  }
}
