import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImeiStatus, PtaStatus } from '@prisma/client';
import {
  IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString,
  Length, Matches, Min,
} from 'class-validator';

export class CreateImeiDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({
    example: '123456789012345',
    description: 'Primary IMEI — 15 digits',
  })
  @IsString()
  @Length(15, 15, { message: 'IMEI must be exactly 15 digits' })
  @Matches(/^\d{15}$/, { message: 'IMEI must contain only digits' })
  imei1!: string;

  @ApiPropertyOptional({ example: '123456789012346' })
  @IsOptional()
  @IsString()
  @Length(15, 15)
  @Matches(/^\d{15}$/)
  imei2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ enum: PtaStatus, example: 'APPROVED' })
  @IsOptional()
  @IsEnum(PtaStatus)
  ptaStatus?: PtaStatus;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ptaTaxPaid?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  ptaTaxDueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  ptaVerifiedAt?: string;

  @ApiPropertyOptional({ enum: ImeiStatus })
  @IsOptional()
  @IsEnum(ImeiStatus)
  status?: ImeiStatus;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  warrantyMonths?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
