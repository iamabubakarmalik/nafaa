import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RestaurantOrderMode } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertHappyHourDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() discountType?: string;
  @ApiProperty() @IsNumber() discountValue!: number;
  @ApiProperty() @IsString() startTime!: string;
  @ApiProperty() @IsString() endTime!: string;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() daysOfWeek?: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validTo?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() categoryIds?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() productIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() minOrderAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxDiscount?: number;
  @ApiPropertyOptional({ enum: RestaurantOrderMode, isArray: true }) @IsOptional() @IsArray() orderModes?: RestaurantOrderMode[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() displayOrder?: number;
}
