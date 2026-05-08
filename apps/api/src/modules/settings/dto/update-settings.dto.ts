import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  shopEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptFooter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptHeader?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableTax?: boolean;
}
