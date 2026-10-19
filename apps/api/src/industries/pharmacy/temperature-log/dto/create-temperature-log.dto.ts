import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateTemperatureLogDto {
  @ApiProperty({ example: 5.2 }) @IsNumber() @Min(-80) @Max(80) temperature!: number;
  @ApiPropertyOptional({ example: 55 }) @IsOptional() @IsNumber() @Min(0) @Max(100) humidity?: number;
  @ApiPropertyOptional({ enum: ['celsius', 'fahrenheit'] }) @IsOptional() @IsIn(['celsius', 'fahrenheit']) unit?: string;
  @ApiProperty({ example: 'Fridge 1' }) @IsString() @MaxLength(60) location!: string;
  @ApiPropertyOptional({ example: 2 }) @IsOptional() @IsNumber() @Min(-80) @Max(80) minLimit?: number;
  @ApiPropertyOptional({ example: 8 }) @IsOptional() @IsNumber() @Min(-80) @Max(80) maxLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() automated?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}
