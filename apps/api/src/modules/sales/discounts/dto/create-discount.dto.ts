import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDiscountDto {
  @ApiProperty({ example: 'EID2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DiscountType, example: 'PERCENTAGE' })
  @IsEnum(DiscountType)
  type!: DiscountType;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchase?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @ApiPropertyOptional({ description: 'Uses per customer; empty = no limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  perCustomerLimit?: number | null;

  @ApiPropertyOptional({ description: 'Branches the code works at; empty = every branch' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  shopIds?: string[];

  @ApiPropertyOptional({ description: 'Business day YYYY-MM-DD (start of day) or ISO time' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Every field optional; null clears a limit or a date. */
export class UpdateDiscountDto extends PartialType(CreateDiscountDto) {}
