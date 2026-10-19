import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DairyBillingCycle } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpsertFarmerDto {
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) fatherName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) cnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) village?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10000) cattleCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10000) buffaloCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10000) cowCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10000) goatCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100000) totalCapacityLiters?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100000) ratePerLiter?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(10000) fatBonusRate?: number;
  @ApiPropertyOptional({ enum: DairyBillingCycle }) @IsOptional() @IsEnum(DairyBillingCycle) paymentCycle?: DairyBillingCycle;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) cnicFrontUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) cnicBackUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

/** Edits send only what changed. */
export class UpdateFarmerDto extends PartialType(UpsertFarmerDto) {}

export class FarmerPaymentDto {
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) notes?: string;
}
