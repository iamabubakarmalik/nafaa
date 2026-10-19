import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JewelryMetalType, JewelryPurity } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';

export class UpsertMetalRateDto {
  @ApiProperty({ enum: JewelryMetalType }) @IsEnum(JewelryMetalType) metalType!: JewelryMetalType;
  @ApiProperty({ enum: JewelryPurity }) @IsEnum(JewelryPurity) purity!: JewelryPurity;
  @ApiProperty() @IsNumber() @IsPositive() ratePerGram!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) ratePerTola?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) ratePerOunce?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) buyRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sellRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() effectiveDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

/** Today's rates for several karats in one go. */
export class BulkMetalRatesDto {
  @ApiProperty({ type: [UpsertMetalRateDto] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => UpsertMetalRateDto) rates!: UpsertMetalRateDto[];
}
