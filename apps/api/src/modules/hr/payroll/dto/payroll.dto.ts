import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min,
  ValidateIf, ValidateNested,
} from 'class-validator';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_AMOUNT = 100_000_000;

const PAY_SOURCES = ['DRAWER', 'ACCOUNT', 'NONE'] as const;
export type PaySource = (typeof PAY_SOURCES)[number];

export class MonthQueryDto {
  @ApiProperty({ example: '2026-10' }) @Matches(MONTH, { message: 'Mahina "2026-10" ki shakal me dein' }) month!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ example: '2026-10', description: 'Last month of the window; defaults to the current month' })
  @IsOptional() @Matches(MONTH) month?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(3) @Max(24) months?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class HistoryQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() staffId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional({ enum: ['salary', 'advance'] }) @IsOptional() @IsIn(['salary', 'advance']) kind?: 'salary' | 'advance';
  @ApiPropertyOptional({ enum: ['PENDING', 'PARTIAL', 'PAID', 'CANCELLED'] })
  @IsOptional() @IsIn(['PENDING', 'PARTIAL', 'PAID', 'CANCELLED']) status?: 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
  @ApiPropertyOptional({ example: '2026-01' }) @IsOptional() @Matches(MONTH) from?: string;
  @ApiPropertyOptional({ example: '2026-10' }) @IsOptional() @Matches(MONTH) to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

/** A bonus or a deduction with its reason. */
class PayLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(60) label!: string;
  @ApiProperty() @IsNumber() @Min(1) @Max(MAX_AMOUNT) amount!: number;
}

/** Where the money comes from. NONE saves the salary as due without paying. */
export class PaySourceDto {
  @ApiProperty({ enum: PAY_SOURCES }) @IsIn(PAY_SOURCES as unknown as string[]) source!: PaySource;
  @ApiPropertyOptional() @ValidateIf((o) => o.source === 'ACCOUNT') @IsString() @IsNotEmpty() accountId?: string;
  /** Pay even when the drawer or account shows less money. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowNegative?: boolean;
  /** One key per click; a retry with the same key is not posted twice. */
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(64) requestId!: string;
}

class RunRowDto {
  @ApiProperty() @IsString() @IsNotEmpty() staffId!: string;
  @ApiPropertyOptional({ type: [PayLineDto] }) @IsOptional() @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => PayLineDto) adds?: PayLineDto[];
  @ApiPropertyOptional({ type: [PayLineDto] }) @IsOptional() @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => PayLineDto) cuts?: PayLineDto[];
  /** Days (daily wage), hours (hourly) or tasks (per task) to pay for, instead of the attendance count. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(10_000) units?: number;
  /** Overtime amount instead of the one worked out from attendance. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(MAX_AMOUNT) overtimePay?: number;
  /** Do not cut absent days and unpaid leave from a monthly salary. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() skipAbsentCut?: boolean;
  /** Pay this month's commission with the salary. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includeCommission?: boolean;
  /** Amount to pay now; the full net pay when left out. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(MAX_AMOUNT) payAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class RunPayrollDto extends PaySourceDto {
  @ApiProperty({ example: '2026-10' }) @Matches(MONTH, { message: 'Mahina "2026-10" ki shakal me dein' }) month!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiProperty({ type: [RunRowDto] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => RunRowDto) rows!: RunRowDto[];
}

export class PayBalanceDto extends PaySourceDto {
  @ApiProperty() @IsNumber() @Min(1) @Max(MAX_AMOUNT) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class CancelDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) reason!: string;
  /** Request key for the money given back; needed when something was paid. */
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(64) requestId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class CreateAdvanceDto extends PaySourceDto {
  @ApiProperty() @IsString() @IsNotEmpty() staffId!: string;
  @ApiProperty() @IsNumber() @Min(1) @Max(MAX_AMOUNT) amount!: number;
  /** Months to cut it over; 1 = all from the first month's salary. */
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(12) installments?: number;
  /** First salary month the cut starts from. */
  @ApiProperty({ example: '2026-10' }) @Matches(MONTH, { message: 'Mahina "2026-10" ki shakal me dein' }) firstMonth!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}
