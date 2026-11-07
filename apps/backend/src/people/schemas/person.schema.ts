import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PersonDocument = HydratedDocument<Person>;

@Schema({ collection: 'people', timestamps: true })
export class Person {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  /** Stable seed key so re-seeding upserts deterministically. */
  @Prop({ required: true, unique: true })
  seedKey!: string;
}

export const PersonSchema = SchemaFactory.createForClass(Person);
