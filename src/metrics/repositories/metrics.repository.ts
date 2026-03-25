import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { Metric, MetricDocument } from '../schemas/metric.schema';
import type {
  IMetricsRepository,
  CreateMetricData,
  MetricFilter,
  FindWithCountResult,
  AggregatedDayEntry,
} from '../interfaces/metrics-repository.interface';

@Injectable()
export class MetricsRepository implements IMetricsRepository {
  private readonly logger = new Logger(MetricsRepository.name);

  constructor(
    @InjectModel(Metric.name) private readonly metricModel: Model<MetricDocument>,
  ) {}

  async create(data: CreateMetricData): Promise<Metric> {
    const start = Date.now();
    const result = await this.metricModel.create(data);
    this.logger.debug(`create() completed in ${Date.now() - start}ms`);
    return result;
  }

  async findWithCount(
    filter: MetricFilter,
    skip: number,
    limit: number,
  ): Promise<FindWithCountResult> {
    const start = Date.now();
    const [data, total] = await Promise.all([
      this.metricModel
        .find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.metricModel.countDocuments(filter).exec(),
    ]);

    this.logger.debug(
      `findWithCount() returned ${data.length}/${total} in ${Date.now() - start}ms`,
    );
    return { data, total };
  }

  async aggregateLatestPerDay(
    userId: string,
    type: string,
    from: Date,
    to: Date,
  ): Promise<AggregatedDayEntry[]> {
    const start = Date.now();
    const pipeline: PipelineStage[] = [
      {
        $match: {
          userId,
          type,
          date: { $gte: from, $lte: to },
        },
      },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' },
          },
          baseValue: { $first: '$baseValue' },
          value: { $first: '$value' },
          unit: { $first: '$unit' },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const results = await this.metricModel.aggregate(pipeline).exec();

    this.logger.debug(
      `aggregateLatestPerDay() returned ${results.length} points in ${Date.now() - start}ms`,
    );

    return results.map((r) => ({
      date: r._id as string,
      baseValue: r.baseValue as number,
      value: r.value as number,
      unit: r.unit as string,
    }));
  }
}
