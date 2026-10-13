import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GarmentAlterationStatus, GarmentPriority } from '@prisma/client';
import { IsArray, IsEnum, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAlterationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiProperty() @IsString() garmentDescription!: string;
  @ApiProperty() @IsString() alterationType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alterationDetails?: string;
  @ApiPropertyOptional({ enum: GarmentPriority }) @IsOptional() @IsEnum(GarmentPriority) priority?: GarmentPriority;
  @ApiPropertyOptional() @IsOptional() @IsString() promisedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tailorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) charges?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() beforeImageUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

const METHODS = ['CASH', 'CARD', 'BANK', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];

export class AlterationStatusDto {
  @ApiProperty({ enum: GarmentAlterationStatus }) @IsEnum(GarmentAlterationStatus) status!: GarmentAlterationStatus;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) afterImageUrls?: string[];
  /** How the money was taken, used for the sale made on delivery. */
  @ApiPropertyOptional() @IsOptional() @IsIn(METHODS) paymentMethod?: string;
  /** Money taken at delivery. Left out, the full remaining amount is taken as collected. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidNow?: number;
}

export class AlterationPaymentDto {
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(METHODS) paymentMethod?: string;
}
