import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateExchangeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() originalSaleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() originalInvoice?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiProperty() @IsString() productName!: string;
  @ApiProperty() @IsString() originalSize!: string;
  @ApiProperty() @IsString() newSize!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() colorChanged?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() originalColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() newColor?: string;

  @ApiProperty() @IsString() reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reasonCategory?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() priceDifference?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() refundIssued?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() additionalCharged?: number;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photoUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateExchangeStatusDto {
  @ApiProperty() @IsString() status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
