import {
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NAVIGATION_TYPES } from '../schemas/visit.schema';

export class CreateVisitDto {
  @IsMongoId()
  personId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(128)
  address!: string;

  @IsIn([...NAVIGATION_TYPES])
  navigationType!: (typeof NAVIGATION_TYPES)[number];

  @IsOptional()
  @IsIn(['success', 'not-found'])
  status?: 'success' | 'not-found';
}
