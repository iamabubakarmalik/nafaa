import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerGender } from '@prisma/client';
import {
  ValidateIf,
  IsBoolean, IsDateString, IsEmail, IsEnum, IsNotEmpty, IsNumber,
  IsIn, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';
import { PRICE_TIERS, type PriceTier } from '../../../../common/helpers/price-tier.helper';

export class CreateCustomerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '')
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cnic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  area?: string;

  @ApiPropertyOptional({ enum: CustomerGender })
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '')
  @IsEnum(CustomerGender)
  gender?: CustomerGender;

  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '')
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVip?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  ntn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRegistered?: boolean;

  /** Default counter price for this customer; null or empty clears it (shop default). */
  @ApiPropertyOptional({ enum: PRICE_TIERS, nullable: true })
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '')
  @IsIn(PRICE_TIERS)
  priceTier?: PriceTier | null;
}
