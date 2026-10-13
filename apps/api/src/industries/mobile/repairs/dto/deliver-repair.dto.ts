import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

export class DeliverRepairDto {
  @ApiPropertyOptional({ description: 'Delivery ke waqt jo paisa liya (baqi balance)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsIn(MONEY_METHODS)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
