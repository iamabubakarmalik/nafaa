import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DairyBillingCycle, DairyDeliveryFrequency, DairyKhataStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpsertCustomerDto {
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) cnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) area?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) landmark?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional({ enum: DairyDeliveryFrequency }) @IsOptional() @IsEnum(DairyDeliveryFrequency) deliveryFrequency?: DairyDeliveryFrequency;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(500) morningQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(500) eveningQuantity?: number;
  /** Product id of what this customer gets (plain milk when left out). */
  @ApiPropertyOptional() @IsOptional() @IsString() productPreference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) containerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100000) customRate?: number;
  @ApiPropertyOptional({ enum: DairyBillingCycle }) @IsOptional() @IsEnum(DairyBillingCycle) billingCycle?: DairyBillingCycle;
  @ApiPropertyOptional({ enum: DairyKhataStatus }) @IsOptional() @IsEnum(DairyKhataStatus) status?: DairyKhataStatus;
  /** Money taken at sign-up; goes on the khata as an advance. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) advancePayment?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() advanceMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
}

/** Edits send only what changed. */
export class UpdateCustomerDto extends PartialType(UpsertCustomerDto) {}

export class CloseCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) reason?: string;
}

export class PauseDeliveryDto {
  @ApiProperty() @IsString() pausedFrom!: string;
  @ApiProperty() @IsString() pausedTo!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) reason?: string;
}

export class CustomerPaymentDto {
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) notes?: string;
}
