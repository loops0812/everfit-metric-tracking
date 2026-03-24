import { Metric } from '../schemas/metric.schema';
import { CreateMetricDto } from '../dto';

export const METRICS_SERVICE = Symbol('IMetricsService');

export interface IMetricsService {
  create(dto: CreateMetricDto): Promise<Metric>;
}
