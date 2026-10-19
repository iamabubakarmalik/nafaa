import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpsertZoneDto {
  @ApiProperty() @IsString() @MaxLength(80) name!: string;
  @ApiProperty() @IsString() @MaxLength(80) city!: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) @MaxLength(80, { each: true }) areas?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) travelCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) emergencyChargeExtra?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(600) defaultTravelTimeMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) activeHours?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEmergencyServed?: boolean;
}
