import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PetGroomingServiceType, PetGroomingStatus, PetSpeciesType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

const METHOD_MSG = { message: 'Payment ka tareeqa sahi chunein' };

export class CreateGroomingAppointmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Malik ka naam likhein' }) @MaxLength(120) customerName!: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Phone likhein' }) @MaxLength(20) customerPhone!: string;

  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Pet ka naam likhein' }) @MaxLength(80) petName!: string;
  @ApiProperty({ enum: PetSpeciesType }) @IsEnum(PetSpeciesType) petSpecies!: PetSpeciesType;
  @ApiPropertyOptional() @IsOptional() @IsString() petBreed?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(600) petAgeMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(500) petWeightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() petTemperament?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() petAllergies?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() petSpecialInstructions?: string;

  @ApiProperty() @IsString() scheduledDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledSlot?: string;

  @ApiProperty({ enum: PetGroomingServiceType }) @IsEnum(PetGroomingServiceType) serviceType!: PetGroomingServiceType;
  @ApiPropertyOptional({ enum: PetGroomingServiceType, isArray: true }) @IsOptional() @IsArray() @ArrayMaxSize(12) @IsEnum(PetGroomingServiceType, { each: true }) additionalServices?: PetGroomingServiceType[];
  @ApiPropertyOptional() @IsOptional() @IsString() serviceDescription?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() groomerId?: string;
  @ApiProperty() @IsNumber() @Min(0) serviceFee!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) additionalCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) photosBeforeUrls?: string[];
}

/** Editing a booking: any booking field, all optional. */
export class UpdateGroomingAppointmentDto extends PartialType(CreateGroomingAppointmentDto) {}

/** Taking the pet back: the rest of the bill is settled here. */
export class PaymentPartDto {
  @ApiProperty() @IsIn(MONEY_METHODS, METHOD_MSG) method!: string;
  @ApiProperty() @IsNumber() @Min(0) amount!: number;
}

export class PickupGroomingDto {
  @ApiPropertyOptional() @IsOptional() @IsIn(MONEY_METHODS, METHOD_MSG) paymentMethod?: string;
  /** Money handed over now; missing = the whole balance. Less than the balance goes on the khata. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  /** Split payment (cash + card…); its sum is the money handed over. */
  @ApiPropertyOptional({ type: [PaymentPartDto] }) @IsOptional() @IsArray() @ArrayMaxSize(6) @ValidateNested({ each: true }) @Type(() => PaymentPartDto) payments?: PaymentPartDto[];
}

export class CompleteGroomingDto {
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosAfterUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) additionalCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) groomerNotes?: string;
}

export class CheckInDto {
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosBeforeUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class GroomingPaymentDto {
  @ApiProperty() @IsNumber() @Min(0.01, { message: 'Amount sahi likhein' }) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(MONEY_METHODS, METHOD_MSG) paymentMethod?: string;
}

export class UpdateGroomingStatusDto {
  @ApiProperty({ enum: PetGroomingStatus }) @IsEnum(PetGroomingStatus) status!: PetGroomingStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rescheduledDate?: string;
}

export class RateGroomingDto {
  @ApiProperty() @IsInt() @Min(1) @Max(5) rating!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() feedback?: string;
}
