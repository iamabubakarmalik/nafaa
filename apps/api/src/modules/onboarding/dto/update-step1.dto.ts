import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
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
}
