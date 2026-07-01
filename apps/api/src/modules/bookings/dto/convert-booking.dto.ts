import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ConvertBookingDto {
  @ApiPropertyOptional({ description: 'Additional payment collected at pickup' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalPayment?: number;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
