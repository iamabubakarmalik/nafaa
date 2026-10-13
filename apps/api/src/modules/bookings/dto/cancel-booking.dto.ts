import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { MONEY_METHODS } from '../../../common/helpers/sale-payments.helper';

export class CancelBookingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;

  @ApiProperty({ description: 'Refund the paid advance back to customer?' })
  @IsBoolean()
  refundAdvance!: boolean;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Method to use for refund (if refundAdvance = true)',
  })
  @IsOptional()
  @IsIn(MONEY_METHODS)
  refundMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Owner PIN, when refunds need it (Settings)' })
  @IsOptional()
  @IsString()
  managerPin?: string;
}
