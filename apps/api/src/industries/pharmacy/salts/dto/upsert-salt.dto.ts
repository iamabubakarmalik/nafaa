import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DrugScheduleClass } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpsertSaltDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() genericName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() standardDose?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() maxDailyDose?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeOfAdmin?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPregnancySafe?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isLactationSafe?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPediatricSafe?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() minAgeYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() contraindications?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sideEffects?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warnings?: string;
  @ApiPropertyOptional({ enum: DrugScheduleClass }) @IsOptional() @IsEnum(DrugScheduleClass) scheduleClass?: DrugScheduleClass;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresPrescription?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isNarcotic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBanned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
