import { Metric } from '../schemas/metric.schema';
import { CreateMetricDto, QueryMetricDto, ChartQueryDto } from '../dto';

export const METRICS_SERVICE = Symbol('IMetricsService');

export interface MetricResult {
  userId: string;
  type: string;
  value: number;
  unit: string;
  date: Date;
  createdAt?: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface ChartResult {
  userId: string;
  type: string;
  unit: string;
  period: string;
  from: string;
  to: string;
  dataPoints: ChartDataPoint[];
}

export interface IMetricsService {
  create(dto: CreateMetricDto): Promise<Metric>;
  findAll(query: QueryMetricDto): Promise<PaginatedResult<MetricResult>>;
  getChartData(query: ChartQueryDto): Promise<ChartResult>;
}
