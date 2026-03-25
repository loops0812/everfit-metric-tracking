import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './services/metrics.service';
import { Metric, MetricSchema } from './schemas/metric.schema';
import { DailyMetric, DailyMetricSchema } from './schemas/daily-metric.schema';
import { METRICS_SERVICE } from './interfaces/metrics-service.interface';
import { METRICS_REPOSITORY } from './interfaces/metrics-repository.interface';
import { DAILY_METRIC_REPOSITORY } from './interfaces/daily-metric-repository.interface';
import { MetricsRepository } from './repositories/metrics.repository';
import { DailyMetricRepository } from './repositories/daily-metric.repository';
import {
  DISTANCE_CONVERTER,
  TEMPERATURE_CONVERTER,
} from './converters/converter.tokens';
import { DistanceConverter } from './converters/distance.converter';
import { TemperatureConverter } from './converters/temperature.converter';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Metric.name, schema: MetricSchema },
      { name: DailyMetric.name, schema: DailyMetricSchema },
    ]),
  ],
  controllers: [MetricsController],
  providers: [
    {
      provide: DISTANCE_CONVERTER,
      useClass: DistanceConverter,
    },
    {
      provide: TEMPERATURE_CONVERTER,
      useClass: TemperatureConverter,
    },
    {
      provide: METRICS_REPOSITORY,
      useClass: MetricsRepository,
    },
    {
      provide: DAILY_METRIC_REPOSITORY,
      useClass: DailyMetricRepository,
    },
    {
      provide: METRICS_SERVICE,
      useClass: MetricsService,
    },
  ],
  exports: [METRICS_SERVICE],
})
export class MetricsModule {}
