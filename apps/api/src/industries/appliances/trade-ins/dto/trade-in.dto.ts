import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import type { ApplianceTradeInStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/** How the old unit is: still working, needs repair, or only good for scrap. */
export const TRADE_IN_CONDITIONS = ['WORKING', 'NEEDS_REPAIR', 'SCRAP'] as const;
const VIEWS = ['HELD', 'SOLD', 'SCRAPPED', 'RETURNED', 'all'] as const;
const METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'] as const;

export class CreateApplianceTradeInDto {
  @ApiProperty({ example: 'Purana AC 1.5 ton' }) @IsString() @MinLength(2, { message: 'Kya liya — maslan: purana AC 1.5 ton' }) @MaxLength(120) description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) model?: string;
  @ApiPropertyOptional({ enum: TRADE_IN_CONDITIONS }) @IsOptional() @IsIn([...TRADE_IN_CONDITIONS]) condition?: string;
  @ApiProperty({ description: 'Agreed value taken off the new bill' }) @IsNumber({}, { message: 'Qeemat likhein' }) @Min(1, { message: 'Qeemat 0 se zyada likhein' }) @Max(10_000_000, { message: 'Qeemat bohat zyada hai' }) value!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
}

export class UpdateApplianceTradeInDto extends PartialType(OmitType(CreateApplianceTradeInDto, ['customerId'] as const)) {}

export class SetTradeInStatusDto {
  @ApiProperty({ enum: ['HELD', 'SCRAPPED', 'RETURNED'] }) @IsIn(['HELD', 'SCRAPPED', 'RETURNED']) status!: Exclude<ApplianceTradeInStatus, 'SOLD'>;
}

/** Selling the old unit on (to a scrap dealer or another buyer), paid in full. */
export class SellTradeInDto {
  @ApiProperty() @IsNumber({}, { message: 'Kitne ka becha likhein' }) @Min(1, { message: 'Qeemat 0 se zyada likhein' }) @Max(10_000_000, { message: 'Qeemat bohat zyada hai' }) price!: number;
  @ApiPropertyOptional({ enum: METHODS }) @IsOptional() @IsIn([...METHODS]) paymentMethod?: string;
  @ApiPropertyOptional({ description: 'Who bought it, printed on the bill' }) @IsOptional() @IsString() @MaxLength(80) buyer?: string;
}

export class ListTradeInsQuery {
  @ApiPropertyOptional({ enum: VIEWS }) @IsOptional() @IsIn([...VIEWS]) view?: ApplianceTradeInStatus | 'all';
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
