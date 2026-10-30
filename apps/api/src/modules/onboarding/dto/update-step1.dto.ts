import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { BUSINESS_MODELS } from '../constants/business-models';
import { BUSINESS_TEMPLATES } from '../templates/business-templates';

const BUSINESS_TYPES = Object.keys(BUSINESS_TEMPLATES);
const BUSINESS_SIZES = ['MICRO', 'SMALL', 'MEDIUM', 'LARGE'];

export class UpdateStep1Dto {
  @ApiProperty({ enum: BUSINESS_TYPES })
  @IsString()
  @IsIn(BUSINESS_TYPES)
  businessType!: string;

  @ApiProperty({ enum: BUSINESS_SIZES })
  @IsString()
  @IsIn(BUSINESS_SIZES)
  businessSize!: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  /** How the business sells; left out keeps what sign-up saved. */
  @ApiPropertyOptional({ enum: BUSINESS_MODELS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(BUSINESS_MODELS.length)
  @IsIn(BUSINESS_MODELS, { each: true })
  businessModels?: string[];
}
