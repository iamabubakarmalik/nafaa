import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { GymMembershipPlanType } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreatePlanDto {
  @IsString() @MinLength(2, { message: 'Plan ka naam likhein' }) @MaxLength(80) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @ApiPropertyOptional({ enum: GymMembershipPlanType }) @IsOptional() @IsEnum(GymMembershipPlanType) planType?: GymMembershipPlanType;
  @IsNumber() @Min(0) @Max(10_000_000) price!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(10_000_000) registrationFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(10_000_000) securityDeposit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(36500) durationDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(10000) visitLimit?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isUnlimited?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() accessAllHours?: boolean;
  @ApiPropertyOptional() @IsOptional() @Matches(TIME, { message: 'Waqt 06:00 jaisa likhein' }) accessTimeStart?: string | null;
  @ApiPropertyOptional() @IsOptional() @Matches(TIME, { message: 'Waqt 22:00 jaisa likhein' }) accessTimeEnd?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) accessDays?: number[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesPersonalTraining?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(1000) personalTrainingSessions?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesClasses?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(1000) classesLimit?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesNutritionPlan?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesLockerFacility?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesTowelService?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesSteamSauna?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesSwimmingPool?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) includesGuestPasses?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowFreeze?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(365) maxFreezeDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) freezeFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) colorTheme?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) benefits?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(1000) displayOrder?: number;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {}
