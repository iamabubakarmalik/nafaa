import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { GymGoal } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateDietPlanDto {
  @IsString() memberId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trainerId?: string;
  @IsString() @MinLength(2, { message: 'Plan ka naam likhein' }) @MaxLength(120) planName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) planType?: string;
  @ApiPropertyOptional({ enum: GymGoal }) @IsOptional() @IsEnum(GymGoal) goal?: GymGoal;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(730) durationDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(20000) targetCalories?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(2000) proteinGrams?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(2000) carbsGrams?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(2000) fatsGrams?: number;
  @ApiPropertyOptional() @IsOptional() meals?: unknown;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) restrictions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) supplements?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class UpdateDietPlanDto extends PartialType(OmitType(CreateDietPlanDto, ['memberId'] as const)) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
