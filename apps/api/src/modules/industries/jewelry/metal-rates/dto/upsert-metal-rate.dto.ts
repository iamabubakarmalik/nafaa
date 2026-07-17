import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JewelryMetalType, JewelryPurity } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertMetalRateDto {
  @ApiProperty({ enum: JewelryMetalType }) @IsEnum(JewelryMetalType) metalType!: JewelryMetalType;
  @ApiProperty({ enum: JewelryPurity }) @IsEnum(JewelryPurity) purity!: JewelryPurity;
  @ApiProperty() @IsNumber() ratePerGram!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ratePerTola?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ratePerOunce?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() buyRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sellRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() effectiveDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
