import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateReceiptConfigDto {
  @ApiPropertyOptional() @IsOptional() @IsString() template?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showLogo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showShopName?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showShopAddress?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showShopPhone?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showCustomer?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showTaxBreakdown?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showBarcode?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showQRCode?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showFooter?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) footerText?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn([58, 80, 100]) paperWidth?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(['small', 'normal', 'large']) fontSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) copies?: number;

  // Restaurant-specific
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showTableNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showOrderMode?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showWaiterName?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showModifiers?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showSpecialInstructions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showServiceCharge?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showTip?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showKot?: boolean;

  // Carpet-specific
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showDimensions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showSqft?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showRollNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showCutDetails?: boolean;

  // Mobile-specific
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showImei?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showWarranty?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showSerialNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showPtaStatus?: boolean;

  // Retail-specific
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showUnit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showMrp?: boolean;
}
