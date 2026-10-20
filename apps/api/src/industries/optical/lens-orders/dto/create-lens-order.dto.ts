import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateLensOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) customerName!: string;
  @ApiProperty() @IsString() @MaxLength(20) customerPhone!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() prescriptionId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() frameProductId?: string;
  @ApiProperty({ description: 'Frame name, or "Apna frame" for the customer\'s own' }) @IsString() @MinLength(1) @MaxLength(160) frameName!: string;
  @ApiProperty({ description: 'Lens type; REPAIR for a repair job' }) @IsString() @MinLength(1) @MaxLength(60) lensType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) lensMaterial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) lensIndex?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) lensCoatings?: string[];

  // Eye power when no prescription is linked (or to override it)
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightSph?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightCyl?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() rightAxis?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() rightAdd?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leftSph?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leftCyl?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() leftAxis?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leftAdd?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pupilDistance?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) labName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) labOrderRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) framePrice?: number;
  @ApiPropertyOptional({ description: 'Lens price; for a repair, the repair charge' }) @IsOptional() @IsNumber() @Min(0) lensPrice?: number;
  @ApiPropertyOptional({ description: 'What the lab charges the shop for the lens (cost for profit)' }) @IsOptional() @IsNumber() @Min(0) lensCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) fittingCharge?: number;
  @ApiPropertyOptional({ description: 'Advance taken now' }) @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional({ description: 'How the advance was paid' }) @IsOptional() @IsString() paymentMethod?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class UpdateLensOrderStatusDto {
  @ApiProperty() @IsIn(['ORDERED', 'SENT_TO_LAB', 'AT_LAB', 'RECEIVED', 'QC_PASSED', 'FITTED', 'READY', 'DELIVERED', 'CANCELLED']) status!: string;
  /** On CANCELLED: give the advance back. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() refundAdvance?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() refundMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) labOrderRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) qcNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) fittingNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class SendToLabDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) labName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) labOrderRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDate?: string;
}

export class LensOrderPaymentDto {
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
}

export class DeliverLensOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) fittingNotes?: string;
  @ApiPropertyOptional({ description: 'Money taken at hand-over' }) @IsOptional() @IsNumber() @Min(0) payment?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional({ description: 'Leave what is still unpaid on the customer\'s khata' }) @IsOptional() @IsBoolean() onKhata?: boolean;
}
