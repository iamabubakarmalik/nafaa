import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DairyBillingCycle } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertFarmerDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fatherName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() village?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() cattleCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() buffaloCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() cowCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() goatCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalCapacityLiters?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ratePerLiter?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fatBonusRate?: number;
  @ApiPropertyOptional({ enum: DairyBillingCycle }) @IsOptional() @IsEnum(DairyBillingCycle) paymentCycle?: DairyBillingCycle;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnicFrontUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnicBackUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
