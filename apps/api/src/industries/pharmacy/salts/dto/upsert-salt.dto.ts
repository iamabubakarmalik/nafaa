import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DrugScheduleClass } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class UpsertSaltDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;
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

export class AssignSaltItemDto {
  @ApiProperty() @IsString() saltId!: string;
  @ApiProperty({ example: '500mg' }) @IsString() @MaxLength(40) strength!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) strengthValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) strengthUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMainSalt?: boolean;
}

/** The full formula of a product; it replaces the previous one. */
export class AssignSaltsDto {
  @ApiProperty({ type: [AssignSaltItemDto] })
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => AssignSaltItemDto)
  salts!: AssignSaltItemDto[];
}
