import {
  IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Length, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FbrSubmissionMode {
  DISABLED = 'DISABLED',
  MANUAL = 'MANUAL',
  AUTO_ALL = 'AUTO_ALL',
  AUTO_ABOVE_LIMIT = 'AUTO_ABOVE_LIMIT',
}

export enum FbrEnvironment {
  SANDBOX = 'SANDBOX',
  PRODUCTION = 'PRODUCTION',
}

export class UpsertFbrConfigDto {
  @IsBoolean() @IsOptional() isEnabled?: boolean;

  @IsEnum(FbrSubmissionMode) @IsOptional()
  submissionMode?: FbrSubmissionMode;

  @IsEnum(FbrEnvironment) @IsOptional()
  environment?: FbrEnvironment;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  autoSubmitThreshold?: number;

  @IsOptional() @IsString() @Length(3, 30) posId?: string;
  @IsOptional() @IsString() @Length(7, 15) ntn?: string;
  @IsOptional() @IsString() @Length(7, 15) strn?: string;
  @IsOptional() @IsString() apiToken?: string;
  @IsOptional() @IsString() apiEndpoint?: string;

  @IsOptional() @IsString() businessName?: string;
  @IsOptional() @IsString() businessAddress?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() province?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  defaultTaxRate?: number;

  @IsOptional() @IsBoolean() taxInclusive?: boolean;
  @IsOptional() @IsBoolean() printQrOnReceipt?: boolean;
  @IsOptional() @IsBoolean() printFbrLogo?: boolean;
  @IsOptional() @IsBoolean() askBeforeSubmit?: boolean;
  @IsOptional() @IsBoolean() hideNonFbrSales?: boolean;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(12)
  retentionMonths?: number;
}

export class SubmitInvoiceDto {
  @IsString() saleId!: string;
  @IsOptional() @IsBoolean() forceResubmit?: boolean;
}

export class SkipInvoiceDto {
  @IsString() saleId!: string;
  @IsString() reason!: string;
}

export class BulkSubmitDto {
  @IsOptional() saleIds?: string[];
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
}
