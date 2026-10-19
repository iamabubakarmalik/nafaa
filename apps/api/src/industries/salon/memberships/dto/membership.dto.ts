import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaymentMethod, SalonMembershipTier } from '@prisma/client';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const bankAlias = ({ value }: { value: unknown }) => (value === 'BANK' ? 'BANK_TRANSFER' : value);

export class CreatePlanDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @ApiPropertyOptional({ enum: SalonMembershipTier }) @IsOptional() @IsEnum(SalonMembershipTier) tier?: SalonMembershipTier;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @ApiProperty() @IsNumber() @Min(0) price!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(3650) durationDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) discountPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(500) freeServiceCount?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) freeServiceIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() priorityBooking?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() freeConsultation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) birthdayBonus?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) colorTheme?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(120, { each: true }) benefits?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {}

export class SubscribeDto {
  @ApiProperty() @IsString() planId!: string;
  @ApiProperty() @IsString() customerId!: string;
  @ApiProperty({ description: 'Paid now; the rest goes on the khata' }) @IsNumber() @Min(0) amountPaid!: number;
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @Transform(bankAlias) @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class CancelDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
}
