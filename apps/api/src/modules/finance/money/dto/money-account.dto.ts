import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MoneyAccountKind, PaymentMethod } from '@prisma/client';
import {
  IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, NotEquals, ValidateIf,
} from 'class-validator';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AMOUNT = 1_000_000_000;

export class CreateMoneyAccountDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(60) name!: string;
  @ApiProperty({ enum: MoneyAccountKind }) @IsEnum(MoneyAccountKind) kind!: MoneyAccountKind;
  /** Payment method whose money lands here automatically (default account only). */
  @ApiPropertyOptional({ enum: PaymentMethod, nullable: true })
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsEnum(PaymentMethod) method?: PaymentMethod | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) accountTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) accountNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) iban?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-MAX_AMOUNT) @Max(MAX_AMOUNT) openingBalance?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() openingDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(999) sortOrder?: number;
  /** SHOP = the active branch; BUSINESS = the whole business (owner only). */
  @ApiPropertyOptional({ enum: ['SHOP', 'BUSINESS'] }) @IsOptional() @IsIn(['SHOP', 'BUSINESS']) scope?: 'SHOP' | 'BUSINESS';
}

export class UpdateMoneyAccountDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) name?: string;
  @ApiPropertyOptional({ enum: MoneyAccountKind }) @IsOptional() @IsEnum(MoneyAccountKind) kind?: MoneyAccountKind;
  @ApiPropertyOptional({ enum: PaymentMethod, nullable: true })
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsEnum(PaymentMethod) method?: PaymentMethod | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) accountTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) accountNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) iban?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-MAX_AMOUNT) @Max(MAX_AMOUNT) openingBalance?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() openingDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(999) sortOrder?: number;
}

export class ListMoneyAccountsDto {
  @ApiPropertyOptional() @IsOptional() @IsIn(['true', 'false']) inactive?: 'true' | 'false';
}

/** Fields every movement carries. */
class MoveBase {
  @ApiProperty() @IsNumber() @Min(0.01) @Max(MAX_AMOUNT) amount!: number;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  /** One key per movement; a retry with the same key is not posted twice. */
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(64) requestId!: string;
  /** Let the source go below zero (the owner knows the bank shows more). */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowNegative?: boolean;
}

export class TransferDto extends MoveBase {
  @ApiProperty() @IsString() @IsNotEmpty() fromAccountId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() toAccountId!: string;
}

/** Cash between the open drawer and an account, either way. */
export class DrawerMoveDto extends MoveBase {
  @ApiProperty() @IsString() @IsNotEmpty() accountId!: string;
  /** The exact till; the open till of the active branch when left out. */
  @ApiPropertyOptional() @IsOptional() @IsString() registerId?: string;
}

export class AccountEntryDto {
  @ApiProperty() @IsString() @IsNotEmpty() accountId!: string;
  @ApiProperty({ enum: ['DEPOSIT', 'WITHDRAW', 'ADJUSTMENT'] }) @IsIn(['DEPOSIT', 'WITHDRAW', 'ADJUSTMENT']) type!: 'DEPOSIT' | 'WITHDRAW' | 'ADJUSTMENT';
  /** Positive; an ADJUSTMENT may be negative (balance corrected down). */
  @ApiProperty() @IsNumber() @NotEquals(0) @Min(-MAX_AMOUNT) @Max(MAX_AMOUNT) amount!: number;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(64) requestId!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowNegative?: boolean;
  /** When it happened (bank charges seen later); now when left out. */
  @ApiPropertyOptional() @IsOptional() @IsDateString() entryDate?: string;
}

export class StatementDto {
  @ApiPropertyOptional() @IsOptional() @Matches(DAY_KEY) from?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(DAY_KEY) to?: string;
}
