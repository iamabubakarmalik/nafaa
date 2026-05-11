import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Min,
} from 'class-validator';

export class UpdateStep4Dto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledCategories?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least 1 payment method required' })
  @IsString({ each: true })
  paymentMethods?: string[];

  @ApiPropertyOptional({ enum: ['BASIC', 'DETAILED', 'THERMAL_80MM', 'THERMAL_58MM'] })
  @IsOptional()
  @IsIn(['BASIC', 'DETAILED', 'THERMAL_80MM', 'THERMAL_58MM'])
  receiptTemplate?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}
