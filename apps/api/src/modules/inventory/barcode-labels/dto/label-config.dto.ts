import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const LABEL_SHEETS = ['thermal', 'a4-65', 'a4-40', 'a4-24', 'a4-21', 'a4-14', 'custom'] as const;
export const LABEL_FORMATS = ['CODE128', 'EAN13', 'QR'] as const;

/** The shop's label design, saved for every device. All fields optional on save. */
export class LabelConfigDto {
  @IsOptional() @IsIn(LABEL_SHEETS) sheet?: string;
  @IsOptional() @IsNumber() @Min(15) @Max(150) widthMm?: number;
  @IsOptional() @IsNumber() @Min(10) @Max(150) heightMm?: number;
  @IsOptional() @IsInt() @Min(1) @Max(8) cols?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(20) gapMm?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(30) marginMm?: number;
  @IsOptional() @IsIn(LABEL_FORMATS) format?: string;
  @IsOptional() @IsBoolean() showShop?: boolean;
  @IsOptional() @IsBoolean() showName?: boolean;
  @IsOptional() @IsBoolean() showVariant?: boolean;
  @IsOptional() @IsBoolean() showPrice?: boolean;
  @IsOptional() @IsBoolean() showOldPrice?: boolean;
  @IsOptional() @IsBoolean() showSku?: boolean;
  @IsOptional() @IsBoolean() showUnit?: boolean;
  @IsOptional() @IsBoolean() showCode?: boolean;
  @IsOptional() @IsBoolean() showExpiry?: boolean;
  @IsOptional() @IsBoolean() border?: boolean;
  @IsOptional() @IsIn(['retail', 'wholesale', 'cost-code']) priceSource?: string;
  @IsOptional() @IsIn(['left', 'center']) align?: string;
  @IsOptional() @IsNumber() @Min(0.6) @Max(1.6) fontScale?: number;
  @IsOptional() @IsNumber() @Min(0.4) @Max(1) barHeight?: number;
  @IsOptional() @IsString() @MaxLength(40) shopText?: string;
  @IsOptional() @IsString() @MaxLength(40) footerText?: string;
  @IsOptional() @IsIn(['one', 'stock']) copies?: string;
}

export class AssignBarcodesDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(1000) @IsString({ each: true })
  productIds!: string[];

  /** Also give variants without a code their own. */
  @IsOptional() @IsBoolean() variants?: boolean;
}
