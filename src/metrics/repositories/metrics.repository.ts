import { Injectable } from '@nestjs/common';
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
  constructor(
    @InjectModel(Metric.name)
    private readonly metricModel: Model<MetricDocument>,
  ) {}

  async create(data: CreateMetricData): Promise<Metric> {
    return this.metricModel.create(data);
  }

  async findWithCount(
    filter: MetricFilter,
    skip: number,
    limit: number,
  ): Promise<FindWithCountResult> {
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

    return { data, total };
  }

  async aggregateLatestPerDay(
    userId: string,
    type: string,
    from: Date,
    to: Date,
  ): Promise<AggregatedDayEntry[]> {
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

    const results = await this.metricModel
      .aggregate<AggregatedDayEntry>(pipeline)
      .exec();

    return results.map((r) => ({
      date: r._id as string,
      baseValue: r.baseValue,
      value: r.value,
      unit: r.unit,
    }));
  }
}
