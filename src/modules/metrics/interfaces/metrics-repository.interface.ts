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
  /**
   *
   * @param data
   * @return Promise<Metric> The created metric document
   */
  create(data: CreateMetricData): Promise<Metric>;

  /**
   *
   * @param filter
   * @param skip
   * @param limit
   * @return Promise<FindWithCountResult> An object containing the array of metrics and the total count
   */
  findWithCount(
    filter: MetricFilter,
    skip: number,
    limit: number,
  ): Promise<FindWithCountResult>;

  /**
   * Legacy: runtime aggregation for chart data (kept for performance comparison demo).
   */
  aggregateLatestPerDay(
    userId: string,
    type: string,
    from: Date,
    to: Date,
  ): Promise<AggregatedDayEntry[]>;
}
