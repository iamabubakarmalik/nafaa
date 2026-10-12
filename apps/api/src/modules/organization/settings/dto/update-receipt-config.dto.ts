import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

/** An account customers can pay into. */
export class PayAccountDto {
  @IsIn(['JAZZCASH', 'EASYPAISA', 'BANK', 'RAAST', 'NAYAPAY', 'SADAPAY', 'OTHER']) kind!: string;
  @IsString() @MaxLength(80) title!: string;
  @IsString() @IsNotEmpty() @MaxLength(40) number!: string;
  @IsOptional() @IsString() @MaxLength(60) bank?: string;
  @IsOptional() @IsString() @MaxLength(40) iban?: string;
}

/** The shop's receipt design (Settings → Raseed). Every field optional; unknown fields are refused. */
export class UpdateReceiptConfigDto {
  @ApiPropertyOptional() @IsOptional() @IsIn(['58', '80', 'A4']) paper?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['classic', 'modern', 'bold']) style?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['small', 'normal', 'large']) font?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/) accent?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['none', 'shop', 'nafaa', 'both']) watermark?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() showLogo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showAddress?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showPhone?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showTaxNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showCustomer?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showCashier?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showItemNumbers?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showItemDetails?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showSavings?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showKhata?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showBarcode?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showPayQr?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showReviewQr?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showAmountInWords?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showSignature?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) tagline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) footer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(600) terms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) social?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) thanks?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(3) copies?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoPrint?: boolean;

  @ApiPropertyOptional({ type: [PayAccountDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(6) @ValidateNested({ each: true }) @Type(() => PayAccountDto)
  payAccounts?: PayAccountDto[];
  @ApiPropertyOptional() @IsOptional() @IsIn(['due', 'always', 'never']) payWhen?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) payNote?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) a4Title?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['band', 'split', 'minimal']) a4Layout?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showStatus?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showSku?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showCustomerDetails?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(365) dueDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) backText?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['none', 'a4', 'all']) backPrint?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() thermalPattern?: boolean;
}
