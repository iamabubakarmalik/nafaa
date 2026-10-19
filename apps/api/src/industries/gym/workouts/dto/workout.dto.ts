import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateWorkoutDto {
  @IsString() memberId!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() sessionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(600) durationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(10000) caloriesBurned?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) workoutType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) focusArea?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) intensity?: string;
  /** `[{ name, sets: [{ reps, weight }] }]` */
  @ApiPropertyOptional() @IsOptional() @IsArray() exercises?: Array<{ name?: string; sets?: Array<{ reps?: number; weight?: number }> }>;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) memberRating?: number;
}

export class UpdateWorkoutDto extends PartialType(OmitType(CreateWorkoutDto, ['memberId'] as const)) {}
