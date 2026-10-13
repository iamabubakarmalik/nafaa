import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PrescriptionType, RefillFrequency } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class PrescriptionItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiProperty() @IsString() medicineName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() saltName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() strength?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dose?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() frequency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() duration?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() route?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
  @ApiProperty() @IsNumber() prescribedQty!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
}

export class CreatePrescriptionDto {
  @ApiPropertyOptional({ enum: PrescriptionType }) @IsOptional() @IsEnum(PrescriptionType) type?: PrescriptionType;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() doctorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorRegNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorSpeciality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hospitalName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() patientName?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() patientAge?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() patientGender?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientCnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() patientWeight?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() prescriptionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() diagnosis?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chiefComplaint?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) imageUrls?: string[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRefillable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() refillsAllowed?: number;
  @ApiPropertyOptional({ enum: RefillFrequency }) @IsOptional() @IsEnum(RefillFrequency) refillFrequency?: RefillFrequency;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isInsuranceClaim?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceProvider?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceApprovalCode?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: [PrescriptionItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => PrescriptionItemDto)
  items!: PrescriptionItemDto[];
}

class DispenseItemDto {
  @ApiProperty() @IsString() itemId!: string;
  @ApiProperty() @IsNumber() @Min(0) dispensedQty!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) unitPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSubstituted?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() substituteFor?: string;
}

/**
 * Dispensing is billed as a normal sale, so it carries the same payment
 * fields as the counter: method, amount paid now (the rest goes on the
 * patient's khata) and a bill discount.
 */
export class DispenseDto {
  @ApiProperty({ type: [DispenseItemDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => DispenseItemDto)
  items!: DispenseItemDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @Transform(({ value }) => (value === 'BANK' ? 'BANK_TRANSFER' : value))
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Paid now; missing = paid in full' })
  @IsOptional() @IsNumber() @Min(0)
  paidAmount?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}
