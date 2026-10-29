import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerGender } from '@prisma/client';
import {
  ValidateIf,
  IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsNotEmpty, IsNumber,
  IsIn, IsOptional, IsString, Max, MaxLength, Min,
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

  // ── Distribution (wholesale) fields; all optional, empty string clears ──

  /** Price list the customer buys on (counter and sales orders). */
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() priceListId?: string | null;
  /** Route (beat) and visit order on it. */
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() routeId?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsInt() @Min(0) routeSeq?: number | null;
  /** Days a credit bill may stay unpaid; 0 or empty means no limit. */
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsInt() @Min(0) @Max(365) creditDays?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) businessName?: string;
  @ApiPropertyOptional({ description: 'Sales tax registration number' }) @IsOptional() @IsString() @MaxLength(30) strn?: string;
  @ApiPropertyOptional({ description: 'Drug / trade licence number' }) @IsOptional() @IsString() @MaxLength(60) licenseNo?: string;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD' }) @ValidateIf((_, v) => v !== undefined && v !== null && v !== '') @IsDateString() licenseExpiry?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number | null;
}
