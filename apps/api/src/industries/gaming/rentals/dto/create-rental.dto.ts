import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GamingRentalStatus } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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
  @ApiProperty() @IsInt() @Min(1) daysRented!: number;
  @ApiProperty() @IsNumber() @Min(0) pricePerDay!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) depositAmount?: number;
  /** Rent taken now; the whole rent when left out. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() conditionAtCheckout?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosAtCheckout?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() customerSignatureUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guarantorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guarantorPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() securityDocument?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class ReturnRentalDto {
  @ApiPropertyOptional() @IsOptional() @IsString() conditionAtReturn?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photosAtReturn?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) damageFee?: number;
  /** Left out: days late x daily rent. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) lateFee?: number;
  /** Kept for older screens; the refund is worked out from the deposit and fees. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() depositRefunded?: number;
  /** Paid now for fees above the deposit; the rest goes on the khata. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
}

export class UpdateRentalStatusDto {
  @ApiProperty({ enum: GamingRentalStatus }) @IsEnum(GamingRentalStatus) status!: GamingRentalStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
