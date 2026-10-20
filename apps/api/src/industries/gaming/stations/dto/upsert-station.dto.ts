import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GamingConsolePlatform, GamingStationType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertStationDto {
  @ApiProperty() @IsString() @MaxLength(20) stationNumber!: string;
  @ApiProperty() @IsString() @MaxLength(60) name!: string;
  @ApiProperty({ enum: GamingStationType }) @IsEnum(GamingStationType) stationType!: GamingStationType;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional({ enum: GamingConsolePlatform }) @IsOptional() @IsEnum(GamingConsolePlatform) platform?: GamingConsolePlatform;
  @ApiPropertyOptional() @IsOptional() @IsString() specifications?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() installedGames?: string[];
  @ApiProperty() @IsNumber() @Min(0) pricePerHour!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) pricePerHalfHour?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) peakHourPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) offPeakPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) minimumMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isUnderMaintenance?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
