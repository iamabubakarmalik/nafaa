import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RestaurantOrderMode } from '@prisma/client';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Matches, Max,
  MaxLength, Min,
} from 'class-validator';

export const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED', 'BUY_ONE_GET_ONE'] as const;
export type HappyDiscountType = (typeof DISCOUNT_TYPES)[number];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const HHMM_MSG = 'Waqt HH:mm me likhein, maslan 17:00';

export class UpsertHappyHourDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Naam likhein' }) @MaxLength(60) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) description?: string;
  @ApiPropertyOptional({ enum: DISCOUNT_TYPES }) @IsOptional() @IsIn(DISCOUNT_TYPES, { message: 'Discount ka tareeqa chunein' }) discountType?: HappyDiscountType;
  @ApiProperty() @IsNumber() @Min(0) @Max(1000000) discountValue!: number;
  @ApiProperty() @Matches(HHMM, { message: HHMM_MSG }) startTime!: string;
  @ApiProperty() @Matches(HHMM, { message: HHMM_MSG }) endTime!: string;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) daysOfWeek?: number[];
  @ApiPropertyOptional() @IsOptional() @IsDateString({}, { message: 'Tareekh sahi nahi' }) validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString({}, { message: 'Tareekh sahi nahi' }) validTo?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(200) @IsUUID('all', { each: true }) categoryIds?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(500) @IsUUID('all', { each: true }) productIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minOrderAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxDiscount?: number;
  @ApiPropertyOptional({ enum: RestaurantOrderMode, isArray: true }) @IsOptional() @IsArray() @IsEnum(RestaurantOrderMode, { each: true }) orderModes?: RestaurantOrderMode[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}
