import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DamageReasonCode } from '@prisma/client';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';

export class CreateDamageDto {
  @ApiPropertyOptional({ description: 'Branch the goods are in; the active branch when left out' })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({ description: 'ProductUnit the quantity is counted in (carton, dozen); base unit when left out' })
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiProperty({ example: 5, description: 'Quantity in the chosen unit' })
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Cost of one base unit; current cost price when left out' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 50, description: 'Amount recovered (e.g. sold at discount)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  @ApiProperty({ example: 'Expiry ho gaya' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason!: string;

  @ApiPropertyOptional({ enum: DamageReasonCode })
  @IsOptional()
  @IsEnum(DamageReasonCode)
  reasonCode?: DamageReasonCode;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
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
