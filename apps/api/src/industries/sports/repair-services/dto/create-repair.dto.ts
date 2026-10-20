import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CreateRepairServiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() @MinLength(2, { message: 'Customer ka naam likhein' }) @MaxLength(80) customerName!: string;
  @ApiProperty() @IsString() @Matches(/^[0-9+\-\s]{7,16}$/, { message: 'Phone number sahi likhein' }) customerPhone!: string;

  @ApiProperty() @IsString() @MinLength(2, { message: 'Kya cheez hai (bat, racket…) likhein' }) @MaxLength(60) itemType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) itemBrand?: string;
  @ApiProperty() @IsString() @MaxLength(300) itemDescription!: string;
  @ApiProperty() @IsString() @MinLength(2, { message: 'Kya kaam karna hai likhein' }) @MaxLength(500) issue!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() repairType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) advancePaid?: number;
  /** How the advance came in; left out, cash. */
  @ApiPropertyOptional() @IsOptional() @IsIn(['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA']) paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() estimatedReadyAt?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosBeforeUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

/** A part taken from stock for the repair (string, grip). */
export class RepairPart {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) name?: string;
  @ApiProperty() @IsNumber() @Min(0.01) quantity!: number;
  @ApiProperty() @IsNumber() @Min(0) price!: number;
}

export const REPAIR_STATUSES = ['RECEIVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'DELIVERED', 'CANCELLED'];

export class UpdateRepairStatusDto {
  @ApiProperty({ enum: REPAIR_STATUSES }) @IsIn(REPAIR_STATUSES) status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workDone?: string;
  /** Parts from stock; sold on the delivery bill. */
  @ApiPropertyOptional({ type: [RepairPart] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => RepairPart) partsUsed?: RepairPart[];
  /** Repair charge (work); parts are added on top. */
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
  /** Left out, cash. */
  @ApiPropertyOptional() @IsOptional() @IsIn(['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA']) paymentMethod?: string;
}
