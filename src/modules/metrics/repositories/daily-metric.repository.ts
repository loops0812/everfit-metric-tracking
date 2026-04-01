import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DailyMetric,
  DailyMetricDocument,
} from '../schemas/daily-metric.schema';
import type {
  IDailyMetricRepository,
  UpsertDailyData,
} from '../interfaces/daily-metric-repository.interface';
import type { AggregatedDayEntry } from '../interfaces/metrics-repository.interface';

@Injectable()
export class DailyMetricRepository implements IDailyMetricRepository {
  private readonly logger = new Logger(DailyMetricRepository.name);

  constructor(
    @InjectModel(DailyMetric.name)
    private readonly dailyMetricModel: Model<DailyMetricDocument>,
  ) {}

  async upsertDaily(data: UpsertDailyData): Promise<void> {
    const start = Date.now();
    const startOfDay = new Date(data.date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    // Try to update only if the new entry is later than what's stored
    const result = await this.dailyMetricModel.updateOne(
      {
        userId: data.userId,
        type: data.type,
        date: startOfDay,
        latestEntryDate: { $lt: data.latestEntryDate },
      },
      {
        $set: {
          baseValue: data.baseValue,
          value: data.value,
          unit: data.unit,
          latestEntryDate: data.latestEntryDate,
        },
      },
    );

    // If no document matched (either doesn't exist or existing is already newer),
    // try to insert only if no document exists for this day yet
    if (result.matchedCount === 0) {
      try {
        await this.dailyMetricModel.updateOne(
          {
            userId: data.userId,
            type: data.type,
            date: startOfDay,
          },
          {
            $setOnInsert: {
              baseValue: data.baseValue,
              value: data.value,
              unit: data.unit,
              latestEntryDate: data.latestEntryDate,
            },
          },
          { upsert: true },
        );
      } catch (error) {
        // Duplicate key on race condition is fine — another write already created it
        if ((error as { code?: number }).code !== 11000) throw error;
      }
    }

    this.logger.debug(`upsertDaily() completed in ${Date.now() - start}ms`);
  }

  async findByRange(
    userId: string,
    type: string,
    from: Date,
    to: Date,
  ): Promise<AggregatedDayEntry[]> {
    const start = Date.now();
    
    const results = await this.dailyMetricModel
      .find({
        userId,
        type,
        date: { $gte: from, $lte: to },
      })
      .sort({ date: 1 })
      .lean()
      .exec();

    this.logger.debug(
      `findByRange() returned ${results.length} points in ${Date.now() - start}ms`,
    );

    return results.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      baseValue: r.baseValue,
      value: r.value,
      unit: r.unit,
    }));
  }
}
