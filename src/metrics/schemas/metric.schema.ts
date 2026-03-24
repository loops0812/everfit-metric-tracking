import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MetricType } from 'src/commons/enums/metric-type.enum';

export type MetricDocument = HydratedDocument<Metric>;

@Schema({ timestamps: true })
export class Metric {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: MetricType, index: true })
  type: MetricType;

  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  unit: string;

  @Prop({ required: true })
  baseValue: number;

  @Prop({ required: true, index: true })
  date: Date;
}

export const MetricSchema = SchemaFactory.createForClass(Metric);

// Compound index for efficient querying by user + type + date range
MetricSchema.index({ userId: 1, type: 1, date: -1 });
