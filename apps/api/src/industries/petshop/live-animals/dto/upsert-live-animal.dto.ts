import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PetSaleStatus, PetSpeciesType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertLiveAnimalDto {
  @ApiProperty({ enum: PetSpeciesType }) @IsEnum(PetSpeciesType) species!: PetSpeciesType;
  @ApiPropertyOptional() @IsOptional() @IsString() breed?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subBreed?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() ageMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightKg?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() acquiredDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceName?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVaccinated?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() vaccinationDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDewormed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() dewormingDetails?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasHealthCertificate?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() healthNotes?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() costPrice?: number;
  @ApiProperty() @IsNumber() askingPrice!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() currentCage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() feedingSchedule?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specialNeeds?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class SellAnimalDto {
  @ApiProperty() @IsNumber() soldPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() soldToCustomerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() soldToCustomerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class AddMedicalRecordDto {
  @ApiProperty() @IsString() type!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vetName?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() nextDueDate?: string;
}

export class UpdateAnimalStatusDto {
  @ApiProperty({ enum: PetSaleStatus }) @IsEnum(PetSaleStatus) status!: PetSaleStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
