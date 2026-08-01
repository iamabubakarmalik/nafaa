import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplianceAmcStatus, ApplianceAmcType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

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
  @ApiProperty() @IsInt() durationMonths!: number;
  @ApiProperty() @IsNumber() contractValue!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paidAmount?: number;
  @ApiProperty() @IsInt() freeVisitsAllowed!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() freePartsAllowed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() laborCovered?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() gasRefillCovered?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() emergencyCallsAllowed?: number;
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
  @ApiProperty() @IsInt() durationMonths!: number;
  @ApiProperty() @IsNumber() contractValue!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() freeVisitsAllowed?: number;
}
