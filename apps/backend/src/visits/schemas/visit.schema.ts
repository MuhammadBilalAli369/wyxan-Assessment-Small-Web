import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VisitDocument = HydratedDocument<Visit>;

export const NAVIGATION_TYPES = [
  'address-bar',
  'link',
  'back',
  'forward',
  'history-jump',
  'search',
  'publish-open',
] as const;

export type NavigationType = (typeof NAVIGATION_TYPES)[number];

@Schema({ collection: 'visits', timestamps: false })
export class Visit {
  @Prop({ type: Types.ObjectId, ref: 'Person', required: true, index: true })
  personId!: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  address!: string;

  @Prop({ required: true, index: true })
  timestamp!: Date;

  @Prop({ required: true, enum: NAVIGATION_TYPES })
  navigationType!: NavigationType;

  @Prop({ required: true, enum: ['success', 'not-found'] })
  status!: 'success' | 'not-found';

  @Prop({ type: Types.ObjectId, ref: 'Site', required: false, default: null })
  siteId?: Types.ObjectId | null;

  @Prop({ type: String, required: false, default: null })
  title?: string | null;

  /** Deterministic seed identity; omitted for live visits. */
  @Prop({ type: String, required: false, unique: true, sparse: true })
  seedKey?: string;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);
VisitSchema.index({ personId: 1, timestamp: -1 });
