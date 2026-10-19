import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DairyMilkQuality } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Where the tested milk came from. */
export const TEST_SOURCES = ['FARMER', 'INCOMING_BATCH', 'STORAGE_TANK', 'CUSTOMER_COMPLAINT', 'RANDOM'] as const;

export class CreateQualityTestDto {
  @ApiProperty({ enum: TEST_SOURCES }) @IsIn(TEST_SOURCES) sourceType!: (typeof TEST_SOURCES)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() sourceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) sourceName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() testedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(15) fatContent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(15) snfContent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(15) proteinContent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(15) lactoseContent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) waterContent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(14) phLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-30) @Max(100) temperature?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() adulterationDetected?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) adulterationTypes?: string[];
  @ApiPropertyOptional({ enum: DairyMilkQuality }) @IsOptional() @IsEnum(DairyMilkQuality) quality?: DairyMilkQuality;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() passed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) actionTaken?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) testMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
