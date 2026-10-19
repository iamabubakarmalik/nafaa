import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { GymTrainerRole } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateTrainerDto {
  @IsString() staffId!: string;
  @ApiPropertyOptional({ enum: GymTrainerRole }) @IsOptional() @IsEnum(GymTrainerRole) role?: GymTrainerRole;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) specializations?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) certifications?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(60) experienceYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) hourlyRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) perSessionRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(10_000_000) monthlyPackageRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) commissionPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) commissionFixed?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) workingDays?: number[];
  @ApiPropertyOptional() @IsOptional() @Matches(TIME, { message: 'Waqt 06:00 jaisa likhein' }) workStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(TIME, { message: 'Waqt 22:00 jaisa likhein' }) workEndTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) maxDailyClients?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) languages?: string[];
}

export class UpdateTrainerDto extends PartialType(OmitType(CreateTrainerDto, ['staffId'] as const)) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class TrainerPayoutDto {
  @IsNumber() @Min(1) @Max(100_000_000) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(MONEY_METHODS, { message: 'Payment ka tareeqa sahi chunein' }) paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expenseDate?: string;
}
