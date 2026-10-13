import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertSettingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty()
  @IsString()
  value!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class BulkSettingsDto {
  @ApiProperty({ type: [UpsertSettingDto] })
  @IsArray()
  @Type(() => UpsertSettingDto)
  settings!: UpsertSettingDto[];
}
