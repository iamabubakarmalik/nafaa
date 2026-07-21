import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateStep4Dto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  enabledCategories?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMinSize(1) @IsString({ each: true })
  paymentMethods?: string[];

  @ApiPropertyOptional({ enum: ['A4_BASIC', 'A4_DETAILED', 'THERMAL_80MM', 'THERMAL_58MM'] })
  @IsOptional() @IsIn(['A4_BASIC', 'A4_DETAILED', 'THERMAL_80MM', 'THERMAL_58MM'])
  receiptTemplate?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) lowStockThreshold?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableTax?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxRate?: number;
}
