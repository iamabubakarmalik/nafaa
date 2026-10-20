import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PetSaleStatus, PetSpeciesType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

export class UpsertLiveAnimalDto {
  @ApiProperty({ enum: PetSpeciesType }) @IsEnum(PetSpeciesType) species!: PetSpeciesType;
  @ApiPropertyOptional() @IsOptional() @IsString() breed?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subBreed?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) ageMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) weightKg?: number;

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

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costPrice?: number;
  @ApiProperty() @IsNumber() @Min(0) askingPrice!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() currentCage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() feedingSchedule?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specialNeeds?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class SellAnimalDto {
  @ApiProperty() @IsNumber() @Min(0) soldPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() soldToCustomerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() soldToCustomerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  /** Bill already rung up at the POS for this animal; when missing a bill is made here. */
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @IsIn(MONEY_METHODS) paymentMethod?: PaymentMethod;
  /** Paid now; missing = paid in full. Anything less goes on the customer's khata. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
}

export class AddMedicalRecordDto {
  @ApiProperty() @IsIn(['VACCINATION', 'DEWORMING', 'VET_VISIT', 'TREATMENT', 'OTHER'], { message: 'Record ka type chunein' }) type!: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Kya kiya — likhein' }) @MaxLength(300) description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) vetName?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() nextDueDate?: string;
  /** The cost was paid now: written as a shop expense. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() paidNow?: boolean;
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @IsIn(MONEY_METHODS) paymentMethod?: PaymentMethod;
}

export class UpdateAnimalStatusDto {
  @ApiProperty({ enum: PetSaleStatus }) @IsEnum(PetSaleStatus) status!: PetSaleStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
