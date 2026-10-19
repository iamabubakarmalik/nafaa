import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { GymClassStatus, GymClassType } from '@prisma/client';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateClassDto {
  @IsString() @MinLength(2, { message: 'Class ka naam likhein' }) @MaxLength(80) name!: string;
  @ApiPropertyOptional({ enum: GymClassType }) @IsOptional() @IsEnum(GymClassType) classType?: GymClassType;
  @ApiPropertyOptional() @IsOptional() @IsString() trainerId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsDateString({}, { message: 'Class ka waqt chunein' }) scheduledStart!: string;
  @IsDateString({}, { message: 'Class khatam hone ka waqt chunein' }) scheduledEnd!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(500) maxParticipants?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(500) minParticipants?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFree?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) dropInPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) memberPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) roomName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) difficultyLevel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) targetAudience?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  /** Repeat on these weekdays (0 = Sunday) until `recurrenceEndDate`. */
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) recurrenceDays?: number[];
  @ApiPropertyOptional() @IsOptional() @IsDateString() recurrenceEndDate?: string;
}

export class UpdateClassDto extends PartialType(CreateClassDto) {}

export class ClassStatusDto {
  @IsEnum(GymClassStatus, { message: 'Status sahi chunein' }) status!: GymClassStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) cancelledReason?: string;
}

export class BookClassDto {
  @IsString() memberId!: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
}
