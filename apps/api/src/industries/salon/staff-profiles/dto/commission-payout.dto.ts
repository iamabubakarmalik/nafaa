import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';

const bankAlias = ({ value }: { value: unknown }) => (value === 'BANK' ? 'BANK_TRANSFER' : value);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Pays a stylist's unpaid commission for a period (or the chosen lines of it). */
export class PayCommissionDto {
  @ApiProperty() @IsString() staffProfileId!: string;
  @ApiProperty({ example: '2026-10-01' }) @Matches(DAY) from!: string;
  @ApiProperty({ example: '2026-10-31' }) @Matches(DAY) to!: string;
  @ApiPropertyOptional({ type: [String], description: 'Only these lines; left out, every unpaid line of the period' })
  @IsOptional() @IsArray() @ArrayMaxSize(2000) @IsString({ each: true }) lineIds?: string[];
  @ApiPropertyOptional({ enum: MONEY_METHODS, description: 'Defaults to cash from the drawer' })
  @IsOptional() @Transform(bankAlias) @IsIn(MONEY_METHODS) paymentMethod?: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}
