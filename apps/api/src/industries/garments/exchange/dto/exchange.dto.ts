import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

class ExchangeReturnLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() saleItemId!: string;
  @ApiProperty() @IsNumber() @Min(0.01) quantity!: number;
  /** False when the piece is not fit to sell again (booked as damaged). */
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() restock?: boolean;
}

class ExchangeNewLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty() @IsNumber() @Min(0.01) quantity!: number;
}

export class ExchangeDto {
  /** The bill the goods come back from. */
  @ApiProperty() @IsString() @IsNotEmpty() saleId!: string;

  @ApiProperty({ type: [ExchangeReturnLineDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ExchangeReturnLineDto)
  returnItems!: ExchangeReturnLineDto[];

  @ApiProperty({ type: [ExchangeNewLineDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ExchangeNewLineDto)
  items!: ExchangeNewLineDto[];

  /** How the customer pays the difference; left out, cash. */
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @IsIn(MONEY_METHODS) paymentMethod?: PaymentMethod;

  /** Money taken on top of the credit. Left out, exactly the difference. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidNow?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) reason?: string;

  /** Owner's or manager's PIN: refunds that need it, and bills older than the exchange window. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
}
