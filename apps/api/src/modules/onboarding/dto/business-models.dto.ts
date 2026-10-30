import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn } from 'class-validator';
import { BUSINESS_MODELS } from '../constants/business-models';

export class BusinessModelsDto {
  @ApiProperty({ enum: BUSINESS_MODELS, isArray: true, example: ['RETAIL', 'ONLINE'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BUSINESS_MODELS.length)
  @IsIn(BUSINESS_MODELS, { each: true })
  businessModels!: string[];
}
