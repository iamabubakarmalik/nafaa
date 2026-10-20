import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export const FREQUENCIES = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const;

export class CreateSubscriptionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Customer ka naam likhein' }) @MaxLength(120) customerName!: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Phone likhein' }) @MaxLength(20) customerPhone!: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Pata likhein' }) @MaxLength(500) deliveryAddress!: string;

  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Plan ka naam likhein' }) @MaxLength(120) planName!: string;
  @ApiProperty() @IsIn(FREQUENCIES, { message: 'Kitni dafa: roz, hafta, do hafte ya mahina' }) frequency!: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Bouquet likhein' }) @MaxLength(120) bouquetType!: string;
  @ApiProperty() @IsNumber() @Min(0) pricePerDelivery!: number;

  @ApiProperty() @IsString() startDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() preferences?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {}
