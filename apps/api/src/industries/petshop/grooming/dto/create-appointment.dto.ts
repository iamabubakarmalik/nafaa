import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PetGroomingServiceType, PetGroomingStatus, PetSpeciesType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateGroomingAppointmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;

  @ApiProperty() @IsString() petName!: string;
  @ApiProperty({ enum: PetSpeciesType }) @IsEnum(PetSpeciesType) petSpecies!: PetSpeciesType;
  @ApiPropertyOptional() @IsOptional() @IsString() petBreed?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() petAgeMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() petWeightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() petTemperament?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() petAllergies?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() petSpecialInstructions?: string;

  @ApiProperty() @IsString() scheduledDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledSlot?: string;

  @ApiProperty({ enum: PetGroomingServiceType }) @IsEnum(PetGroomingServiceType) serviceType!: PetGroomingServiceType;
  @ApiPropertyOptional({ enum: PetGroomingServiceType, isArray: true }) @IsOptional() @IsArray() additionalServices?: PetGroomingServiceType[];
  @ApiPropertyOptional() @IsOptional() @IsString() serviceDescription?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() groomerId?: string;
  @ApiProperty() @IsNumber() serviceFee!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() additionalCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
}

export class CompleteGroomingDto {
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosAfterUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() additionalCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() groomerNotes?: string;
}

export class CheckInDto {
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosBeforeUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class GroomingPaymentDto {
  @ApiProperty() @IsNumber() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
}

export class UpdateGroomingStatusDto {
  @ApiProperty({ enum: PetGroomingStatus }) @IsEnum(PetGroomingStatus) status!: PetGroomingStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rescheduledDate?: string;
}

export class RateGroomingDto {
  @ApiProperty() @IsInt() rating!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() feedback?: string;
}
