import {
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSiteDto {
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  address!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  html!: string;

  @IsMongoId()
  authorId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
