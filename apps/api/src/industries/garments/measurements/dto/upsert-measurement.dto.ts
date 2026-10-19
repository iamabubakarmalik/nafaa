import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GarmentGender, GarmentMeasurementUnit } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpsertMeasurementDto {
  @ApiProperty() @IsString() customerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) profileName?: string;
  @ApiPropertyOptional({ enum: GarmentGender }) @IsOptional() @IsEnum(GarmentGender) gender?: GarmentGender;
  @ApiPropertyOptional({ enum: GarmentMeasurementUnit }) @IsOptional() @IsEnum(GarmentMeasurementUnit) unit?: GarmentMeasurementUnit;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) neck?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) shoulder?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) chest?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) bust?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) waist?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) hip?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) armhole?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) bicep?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) wrist?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) sleeveLength?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) shirtLength?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) trouserLength?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) inseam?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) thigh?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) knee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) bottom?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) kurtaLength?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) shalwarLength?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) shalwarBottom?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(300) daman?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) postureNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) fittingNotes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}
