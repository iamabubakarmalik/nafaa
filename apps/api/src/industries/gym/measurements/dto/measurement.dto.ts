import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const cm = () => [IsOptional(), IsNumber(), Min(0), Max(400)];
const apply = (decorators: PropertyDecorator[]): PropertyDecorator => (target, key) => decorators.forEach((d) => d(target, key));

export class CreateMeasurementDto {
  @IsString() memberId!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() measurementDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(10) @Max(400) weightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(50) @Max(260) heightCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(5) @Max(100) bmi?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(80) bodyFatPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(90) muscleMassPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(60) visceralFat?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) waterPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(30) boneMassKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(5) @Max(120) metabolicAge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(10000) bmr?: number;
  @ApiPropertyOptional() @apply(cm()) chestCm?: number;
  @ApiPropertyOptional() @apply(cm()) waistCm?: number;
  @ApiPropertyOptional() @apply(cm()) hipsCm?: number;
  @ApiPropertyOptional() @apply(cm()) bicepsCm?: number;
  @ApiPropertyOptional() @apply(cm()) thighsCm?: number;
  @ApiPropertyOptional() @apply(cm()) calvesCm?: number;
  @ApiPropertyOptional() @apply(cm()) neckCm?: number;
  @ApiPropertyOptional() @apply(cm()) shouldersCm?: number;
  @ApiPropertyOptional() @apply(cm()) forearmsCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) bloodPressure?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(20) @Max(250) restingHeartRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) frontPhotoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) sidePhotoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) backPhotoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
