import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const METHODS = ['CASH', 'CARD', 'BANK', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];

export class CreateReservationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(100) quantity?: number;
  /** Agreed price per piece; left out, the selling price. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) unitPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) depositAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(METHODS) paymentMethod?: string;
  /** How many days to hold; left out, 7. */
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(90) holdDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() expiresAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class SellReservationDto {
  /** Money taken now on top of the deposit. Left out, the full balance. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidNow?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(METHODS) paymentMethod?: string;
}

export class ConvertReservationDto {
  @ApiProperty() @IsString() saleId!: string;
}

export class ExtendReservationDto {
  @ApiProperty() @IsInt() @Min(1) @Max(90) days!: number;
}
