import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertPlanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  priceMonthly!: number;

  @ApiProperty({ example: 4000 })
  @IsNumber()
  @Min(0)
  priceQuarterly!: number;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0)
  priceYearly!: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(0)
  maxProducts!: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  maxUsers!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  maxShops!: number;

  @ApiProperty({ example: 2000 })
  @IsInt()
  @Min(0)
  maxSalesPerMonth!: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() featurePos?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureBarcodeScanner?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureMultiShop?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureReports?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureProfitReport?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureLoyalty?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureDiscounts?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureKhata?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureExports?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureBackup?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureNotifications?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureCashRegister?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureStockTransfer?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureReturns?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureSupport24x7?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureWhatsappReceipt?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featureCustomBranding?: boolean;
}
