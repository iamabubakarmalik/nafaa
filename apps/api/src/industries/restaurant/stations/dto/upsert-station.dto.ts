import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class UpsertStationDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Station ka naam likhein' }) @MaxLength(40) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) printerName?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(200) @IsUUID('all', { each: true }) categoryIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

/** Partial edit: only the fields sent change. */
export class UpdateStationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty({ message: 'Station ka naam likhein' }) @MaxLength(40) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) printerName?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(200) @IsUUID('all', { each: true }) categoryIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
