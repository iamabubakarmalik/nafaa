import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

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
  @IsEnum(PaymentMethod)
  refundMethod?: PaymentMethod;
}
