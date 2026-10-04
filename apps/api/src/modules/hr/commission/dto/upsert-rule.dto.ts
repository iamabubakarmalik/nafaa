import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';

export enum CommissionBasisDto {
  SALE = 'SALE',
  PROFIT = 'PROFIT',
  PER_BILL = 'PER_BILL',
}

export enum CommissionValueTypeDto {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export class UpsertRuleDto {
  @ApiPropertyOptional({ description: 'Rule ka naam — "Cake par 5%"' })
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Kis bande par — khali to sab par' })
  @IsOptional() @IsString()
  userId?: string;

  @ApiProperty({ enum: CommissionBasisDto })
  @IsEnum(CommissionBasisDto)
  basis!: CommissionBasisDto;

  @ApiPropertyOptional({ enum: CommissionValueTypeDto, default: 'PERCENT' })
  @IsOptional() @IsEnum(CommissionValueTypeDto)
  valueType?: CommissionValueTypeDto;

  @ApiProperty({ description: 'PERCENT me %, FIXED me rupay' })
  @IsNumber() @Min(0)
  value!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Itni bikri ke baad commission shuru ho' })
  @IsOptional() @IsNumber() @Min(0)
  minMonthlySale?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  targetAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  targetBonus?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  note?: string;
}
