import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export const QUOTE_LINE_KINDS = ['VISIT', 'LABOUR', 'PART', 'OTHER'] as const;
export type QuoteLineKind = (typeof QUOTE_LINE_KINDS)[number];

export class QuoteLineDto {
  @ApiProperty({ enum: QUOTE_LINE_KINDS }) @IsIn(QUOTE_LINE_KINDS) kind!: QuoteLineKind;
  @ApiProperty() @IsString() @MaxLength(160) description!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.001) @Max(100000) quantity?: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100_000_000) unitPrice!: number;
  /** Shelf product for a part line; it becomes a job part when the quote is turned into a job. */
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
}

export class UpsertQuoteDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() serviceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) serviceName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) problemDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() siteVisitRequired?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() siteVisitCompleted?: boolean;
  /** With lines, the charges are worked out from them. */
  @ApiPropertyOptional({ type: [QuoteLineDto] }) @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => QuoteLineDto) lines?: QuoteLineDto[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) visitCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) labourCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) partsCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) otherCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) termsConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class RejectQuoteDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class ConvertQuoteDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() primaryTechnicianId?: string;
}

export const QUOTE_VIEWS = ['open', 'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'all'] as const;

export class ListQuotesQuery {
  @ApiPropertyOptional({ enum: QUOTE_VIEWS }) @IsOptional() @IsIn(QUOTE_VIEWS) view?: (typeof QUOTE_VIEWS)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
}
