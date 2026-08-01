import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiProperty() @IsString() customerPhone!: string;
  @ApiProperty() @IsString() deliveryAddress!: string;

  @ApiProperty() @IsString() planName!: string;
  @ApiProperty() @IsString() frequency!: string;
  @ApiProperty() @IsString() bouquetType!: string;
  @ApiProperty() @IsNumber() pricePerDelivery!: number;

  @ApiProperty() @IsString() startDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() preferences?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
