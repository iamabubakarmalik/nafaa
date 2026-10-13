import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRepairServiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;

  @ApiProperty() @IsString() itemType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() itemBrand?: string;
  @ApiProperty() @IsString() itemDescription!: string;
  @ApiProperty() @IsString() issue!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() repairType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) advancePaid?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() estimatedReadyAt?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosBeforeUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export const REPAIR_STATUSES = ['RECEIVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'DELIVERED', 'CANCELLED'];

export class UpdateRepairStatusDto {
  @ApiProperty({ enum: REPAIR_STATUSES }) @IsIn(REPAIR_STATUSES) status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workDone?: string;
  @ApiPropertyOptional() @IsOptional() partsUsed?: any;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) finalCost?: number;
  /** How the remaining money was taken, used for the sale made on delivery. */
  @ApiPropertyOptional() @IsOptional() @IsIn(['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA']) paymentMethod?: string;
  /** Money taken at delivery. Left out, the full remaining amount is taken as collected. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidNow?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosAfterUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RepairPaymentDto {
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
}
