import { Metric } from '../schemas/metric.schema';

export const METRICS_REPOSITORY = Symbol('IMetricsRepository');

export interface CreateMetricData {
  userId: string;
  type: string;
  value: number;
  unit: string;
  baseValue: number;
  date: Date;
}

export interface MetricFilter {
  userId: string;
  type: string;
}

export interface FindWithCountResult {
  data: Metric[];
  total: number;
}

export interface AggregatedDayEntry {
  date: string;
  baseValue: number;
  value: number;
  unit: string;
}

export interface IMetricsRepository {
  create(data: CreateMetricData): Promise<Metric>;

  findWithCount(
    filter: MetricFilter,
    skip: number,
    limit: number,
  ): Promise<FindWithCountResult>;

  aggregateLatestPerDay(
    userId: string,
    type: string,
    from: Date,
    to: Date,
  ): Promise<AggregatedDayEntry[]>;
}
