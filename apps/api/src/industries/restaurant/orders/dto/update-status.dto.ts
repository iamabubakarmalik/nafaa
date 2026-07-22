import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RestaurantOrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: RestaurantOrderStatus }) @IsEnum(RestaurantOrderStatus) status!: RestaurantOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
}

export class AddPaymentDto {
  @ApiProperty() amount!: number;
  @ApiProperty() @IsString() paymentMethod!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paidBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
