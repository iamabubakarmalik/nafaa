import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { GymEquipmentCategory, GymEquipmentStatus } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

export class CreateEquipmentDto {
  @IsString() @MinLength(2, { message: 'Machine ka naam likhein' }) @MaxLength(120) name!: string;
  @IsEnum(GymEquipmentCategory, { message: 'Category chunein' }) category!: GymEquipmentCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) equipmentNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) purchasePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) vendorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() warrantyExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) roomName?: string;
  @ApiPropertyOptional({ enum: GymEquipmentStatus }) @IsOptional() @IsEnum(GymEquipmentStatus) status?: GymEquipmentStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() nextMaintenanceDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(3650) maintenanceIntervalDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) manualUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {}

export class MaintenanceDto {
  @IsNumber() @Min(0) @Max(10_000_000) cost!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() nextDate?: string;
  /** The repair was paid now: it is written as an expense (drawer for cash). */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() paid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsIn(MONEY_METHODS, { message: 'Payment ka tareeqa sahi chunein' }) paymentMethod?: string;
}
