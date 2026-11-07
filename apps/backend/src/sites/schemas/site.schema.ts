import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SiteDocument = HydratedDocument<Site>;

@Schema({ collection: 'sites', timestamps: true })
export class Site {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  address!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  /** Sanitized HTML safe for sandboxed rendering. */
  @Prop({ required: true })
  html!: string;

  /** Plain text extracted from HTML for search. */
  @Prop({ required: true })
  textContent!: string;

  @Prop({ type: Types.ObjectId, ref: 'Person', required: true, index: true })
  authorId!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  seedKey!: string;
}

export const SiteSchema = SchemaFactory.createForClass(Site);
SiteSchema.index({ textContent: 'text', title: 'text' });
