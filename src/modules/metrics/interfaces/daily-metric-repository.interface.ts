import type { AggregatedDayEntry } from './metrics-repository.interface';

export const DAILY_METRIC_REPOSITORY = Symbol('IDailyMetricRepository');

export interface UpsertDailyData {
  userId: string;
  type: string;
  date: Date;
  baseValue: number;
  value: number;
  unit: string;
  latestEntryDate: Date;
}

export interface IDailyMetricRepository {
  /**
   * Upsert the daily snapshot — only overwrites if the new entry is later
   * than the currently stored `latestEntryDate` for that (userId, type, day).
   */
  upsertDaily(data: UpsertDailyData): Promise<void>;

  /**
   * Simple indexed find for chart data — replaces the expensive aggregation.
   */
  findByRange(
    userId: string,
    type: string,
    from: Date,
    to: Date,
  ): Promise<AggregatedDayEntry[]>;
}
