import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GamingRentalStatus } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRentalDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerCnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiProperty() @IsString() productName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiProperty() @IsString() rentalStartDate!: string;
  @ApiProperty() @IsString() rentalEndDate!: string;
  @ApiProperty() @IsInt() daysRented!: number;
  @ApiProperty() @IsNumber() pricePerDay!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() depositAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() conditionAtCheckout?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosAtCheckout?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() customerSignatureUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guarantorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guarantorPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() securityDocument?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ReturnRentalDto {
  @ApiPropertyOptional() @IsOptional() @IsString() conditionAtReturn?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosAtReturn?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() damageFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() lateFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() depositRefunded?: number;
}

export class UpdateRentalStatusDto {
  @ApiProperty({ enum: GamingRentalStatus }) @IsEnum(GamingRentalStatus) status!: GamingRentalStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
