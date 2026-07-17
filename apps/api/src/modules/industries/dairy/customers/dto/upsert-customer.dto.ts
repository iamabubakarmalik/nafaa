import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DairyBillingCycle, DairyDeliveryFrequency, DairyKhataStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertCustomerDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() area?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landmark?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional({ enum: DairyDeliveryFrequency }) @IsOptional() @IsEnum(DairyDeliveryFrequency) deliveryFrequency?: DairyDeliveryFrequency;
  @ApiPropertyOptional() @IsOptional() @IsNumber() morningQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() eveningQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() productPreference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() containerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() customRate?: number;
  @ApiPropertyOptional({ enum: DairyBillingCycle }) @IsOptional() @IsEnum(DairyBillingCycle) billingCycle?: DairyBillingCycle;
  @ApiPropertyOptional({ enum: DairyKhataStatus }) @IsOptional() @IsEnum(DairyKhataStatus) status?: DairyKhataStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() advancePayment?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
}

export class PauseDeliveryDto {
  @ApiProperty() @IsString() pausedFrom!: string;
  @ApiProperty() @IsString() pausedTo!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
