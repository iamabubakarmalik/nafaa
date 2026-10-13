import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

export class RecordInstallmentPaymentDto {
  @ApiProperty({ example: 20000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ enum: PaymentMethod, default: 'CASH' })
  @IsOptional()
  @IsIn(MONEY_METHODS)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Defaults to current date' })
  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
