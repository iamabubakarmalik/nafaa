import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DamageReasonCode } from '@prisma/client';
import {
  IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';

export class CreateDamageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 50, description: 'Salvage value (e.g. sold at discount)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  @ApiProperty({ example: 'Products expired last week' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ enum: DamageReasonCode })
  @IsOptional()
  @IsEnum(DamageReasonCode)
  reasonCode?: DamageReasonCode;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  supplierClaim?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  claimAmount?: number;
}
