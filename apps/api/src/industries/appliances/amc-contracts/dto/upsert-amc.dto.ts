import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplianceAmcStatus, ApplianceAmcType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

const PAY_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];

export class UpsertAmcDto {
  @ApiPropertyOptional({ enum: ApplianceAmcType }) @IsOptional() @IsEnum(ApplianceAmcType) amcType?: ApplianceAmcType;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialTrackingId?: string;
  @ApiProperty() @IsString() startDate!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(120) durationMonths!: number;
  @ApiProperty() @IsNumber() @Min(0) contractValue!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  /** How `paidAmount` came in; left out, cash. */
  @ApiPropertyOptional() @IsOptional() @IsIn(PAY_METHODS) paymentMethod?: string;
  @ApiProperty() @IsInt() @Min(0) freeVisitsAllowed!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() freePartsAllowed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() laborCovered?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() gasRefillCovered?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) emergencyCallsAllowed?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() servicesIncluded?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() servicesExcluded?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() exclusions?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() documentUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateAmcStatusDto {
  @ApiProperty({ enum: ApplianceAmcStatus }) @IsEnum(ApplianceAmcStatus) status!: ApplianceAmcStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class RenewAmcDto {
  @ApiProperty() @IsInt() @Min(1) @Max(120) durationMonths!: number;
  @ApiProperty() @IsNumber() @Min(0) contractValue!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  /** How `paidAmount` came in; left out, cash. */
  @ApiPropertyOptional() @IsOptional() @IsIn(PAY_METHODS) paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) freeVisitsAllowed?: number;
}

/** Money received later on a contract sold on khata. */
export class AmcPaymentDto {
  @ApiProperty({ example: 2000 }) @IsNumber() @Min(1) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(PAY_METHODS) paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
