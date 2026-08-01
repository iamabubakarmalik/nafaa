import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GamingConsolePlatform, GamingStationType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertStationDto {
  @ApiProperty() @IsString() stationNumber!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ enum: GamingStationType }) @IsEnum(GamingStationType) stationType!: GamingStationType;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional({ enum: GamingConsolePlatform }) @IsOptional() @IsEnum(GamingConsolePlatform) platform?: GamingConsolePlatform;
  @ApiPropertyOptional() @IsOptional() @IsString() specifications?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() installedGames?: string[];
  @ApiProperty() @IsNumber() pricePerHour!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pricePerHalfHour?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() peakHourPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() offPeakPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() minimumMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isUnderMaintenance?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
