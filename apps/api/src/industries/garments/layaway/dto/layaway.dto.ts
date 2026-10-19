import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const METHODS = ['CASH', 'CARD', 'BANK', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];

export class CreateLayawayDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  /** The garment kept aside; it leaves stock when the plan is paid off. */
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tailoringOrderId?: string;
  @ApiProperty() @IsNumber() @Min(1) totalAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) depositAmount?: number;
  @ApiProperty() @IsInt() @Min(1) @Max(36) installmentCount!: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(['WEEKLY', 'BIWEEKLY', 'MONTHLY']) frequency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(METHODS) paymentMethod?: string;
}

export class PayInstallmentDto {
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiProperty() @IsIn(METHODS) paymentMethod!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CancelDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
