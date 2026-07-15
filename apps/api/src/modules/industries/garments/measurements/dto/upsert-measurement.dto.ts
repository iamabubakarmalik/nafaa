import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GarmentGender, GarmentMeasurementUnit } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpsertMeasurementDto {
  @ApiProperty() @IsString() customerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() profileName?: string;
  @ApiPropertyOptional({ enum: GarmentGender }) @IsOptional() @IsEnum(GarmentGender) gender?: GarmentGender;
  @ApiPropertyOptional({ enum: GarmentMeasurementUnit }) @IsOptional() @IsEnum(GarmentMeasurementUnit) unit?: GarmentMeasurementUnit;

  @ApiPropertyOptional() @IsOptional() neck?: number;
  @ApiPropertyOptional() @IsOptional() shoulder?: number;
  @ApiPropertyOptional() @IsOptional() chest?: number;
  @ApiPropertyOptional() @IsOptional() bust?: number;
  @ApiPropertyOptional() @IsOptional() waist?: number;
  @ApiPropertyOptional() @IsOptional() hip?: number;
  @ApiPropertyOptional() @IsOptional() armhole?: number;
  @ApiPropertyOptional() @IsOptional() bicep?: number;
  @ApiPropertyOptional() @IsOptional() wrist?: number;
  @ApiPropertyOptional() @IsOptional() sleeveLength?: number;
  @ApiPropertyOptional() @IsOptional() shirtLength?: number;
  @ApiPropertyOptional() @IsOptional() trouserLength?: number;
  @ApiPropertyOptional() @IsOptional() inseam?: number;
  @ApiPropertyOptional() @IsOptional() thigh?: number;
  @ApiPropertyOptional() @IsOptional() knee?: number;
  @ApiPropertyOptional() @IsOptional() bottom?: number;
  @ApiPropertyOptional() @IsOptional() kurtaLength?: number;
  @ApiPropertyOptional() @IsOptional() shalwarLength?: number;
  @ApiPropertyOptional() @IsOptional() shalwarBottom?: number;
  @ApiPropertyOptional() @IsOptional() daman?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() postureNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fittingNotes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}
