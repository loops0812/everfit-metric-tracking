import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MetricType } from 'src/commons/enums/metric-type.enum';

export type DailyMetricDocument = HydratedDocument<DailyMetric>;

@Schema({ timestamps: true })
export class DailyMetric {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, type: String, enum: MetricType })
  type: MetricType;

  /** Start-of-day (00:00:00.000Z) representing which day this record covers */
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  baseValue: number;

  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  unit: string;

  /** Full timestamp of the source metric entry (used for "latest wins" upsert) */
  @Prop({ required: true })
  latestEntryDate: Date;
}

export const DailyMetricSchema = SchemaFactory.createForClass(DailyMetric);

// One record per user/type/day
DailyMetricSchema.index({ userId: 1, type: 1, date: 1 }, { unique: true });
