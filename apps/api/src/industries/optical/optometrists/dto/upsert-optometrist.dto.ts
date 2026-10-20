import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpsertOptometristDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(20) employeeCode!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) qualification?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) registrationNumber?: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(20) phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) email?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) specializations?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(60) yearsExperience?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) languages?: string[];
  @ApiPropertyOptional({ type: [Number], description: '0 = Sunday … 6 = Saturday' }) @IsOptional() @IsArray() @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) workingDays?: number[];
  @ApiPropertyOptional() @IsOptional() @Matches(TIME, { message: 'Waqt HH:MM likhein' }) workStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(TIME, { message: 'Waqt HH:MM likhein' }) workEndTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) consultationFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) followUpFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) bio?: string;
}

export class UpdateOptometristDto extends PartialType(UpsertOptometristDto) {}
