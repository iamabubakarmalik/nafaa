import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeamOrderStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTeamOrderDto {
  @ApiProperty() @IsString() teamName!: string;
  @ApiProperty() @IsString() contactPerson!: string;
  @ApiProperty() @IsString() contactPhone!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() organization?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;

  @ApiProperty() @IsArray() items!: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    size?: string;
    color?: string;
    customizationNotes?: string;
  }>;

  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() shippingCharge?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasCustomJerseys?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() customizationDetails?: string;
  @ApiPropertyOptional() @IsOptional() playerNames?: any;
  @ApiPropertyOptional() @IsOptional() playerNumbers?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() teamLogoUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() advancePaid?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() expectedDeliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() poNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string;
}

export class UpdateTeamOrderStatusDto {
  @ApiProperty({ enum: TeamOrderStatus }) @IsEnum(TeamOrderStatus) status!: TeamOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RecordPaymentDto {
  @ApiProperty() @IsNumber() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
