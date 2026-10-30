/**
 * Request bodies for distribution phase 2: vans, market returns, principals
 * and claims, targets, cheques and visit analytics.
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString,
  Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { FIELD_MONEY_METHODS, RETURN_CONDITIONS, TARGET_METRICS } from '../distribution.constants';
import { OrderLineDto } from './field.dto';

const bankAlias = ({ value }: { value: unknown }) => (value === 'BANK' ? 'BANK_TRANSFER' : value);
const asBool = ({ value }: { value: unknown }) => value === true || value === 'true' || value === '1';
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

/* ───────────── vans ───────────── */

export class SaveVanDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(60) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) vehicleNo?: string;
  @ApiPropertyOptional({ description: 'Godown the van loads from and unloads to.' }) @IsOptional() @IsString() homeShopId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() salesmanId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}
export class UpdateVanDto extends PartialType(SaveVanDto) {}

export class VanLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string | null;
  @ApiPropertyOptional({ description: 'ProductUnit id (Carton); empty = base unit.' }) @IsOptional() @IsString() unitId?: string | null;
  @ApiProperty({ description: 'Quantity in the pack.' }) @IsNumber() @Min(0.0001) qty!: number;
}

export class VanLoadDto {
  @ApiProperty({ type: [VanLineDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => VanLineDto) items!: VanLineDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class VanOpenDto {
  @ApiPropertyOptional() @IsOptional() @IsString() salesmanId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class VanSellDto {
  @ApiPropertyOptional({ description: 'Id made on the phone; the same sale is saved once.' }) @IsOptional() @IsString() @MaxLength(64) clientRef?: string;
  @ApiProperty() @IsString() @IsNotEmpty() customerId!: string;
  @ApiProperty({ type: [OrderLineDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => OrderLineDto) items!: OrderLineDto[];
  @ApiPropertyOptional({ description: 'Money taken now; the rest goes on the khata.' }) @IsOptional() @IsNumber() @Min(0) cashReceived?: number;
  @ApiPropertyOptional({ enum: FIELD_MONEY_METHODS, default: 'CASH' }) @IsOptional() @Transform(bankAlias) @IsIn(FIELD_MONEY_METHODS) method?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) chequeNo?: string;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD' }) @IsOptional() @IsString() chequeDate?: string;
  @ApiPropertyOptional({ description: 'Manager PIN when the khata part goes over the credit limit.' }) @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
}

export class VanCountDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string | null;
  @ApiProperty({ description: 'Base units counted on the van.' }) @IsNumber() @Min(0) counted!: number;
}

export class VanCloseDto {
  @ApiPropertyOptional({ type: [VanCountDto], description: 'Counted stock; items left out are taken as expected.' })
  @IsOptional() @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => VanCountDto) counts?: VanCountDto[];
  @ApiPropertyOptional({ description: 'Cash the salesman handed in.' }) @IsOptional() @IsNumber() @Min(0) handedIn?: number;
  @ApiPropertyOptional({ description: 'Send what is left back to the godown (default true).' }) @IsOptional() @IsBoolean() unload?: boolean;
  @ApiPropertyOptional({ description: 'Verify the day\'s pending collections now (needs collections.verify).' }) @IsOptional() @IsBoolean() verifyCollections?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

/* ───────────── market returns ───────────── */

export { MarketReturnLineDto, CreateMarketReturnDto } from './market-return.dto';

export class ListMarketReturnsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() collectedById?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

export class ReturnIdsDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @IsString({ each: true }) ids!: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
  @ApiPropertyOptional({ description: 'Owner PIN when Settings ask for one on returns.' }) @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
}

/* ───────────── principals and claims ───────────── */

export class SetPrincipalBrandsDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) brandIds!: string[];
}

export class ClaimRangeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() supplierId?: string;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD; default: start of this month.' }) @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD; default: today.' }) @IsOptional() @IsString() to?: string;
}

export class CreateClaimDto {
  @ApiProperty() @IsString() @IsNotEmpty() supplierId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class ListClaimsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierId?: string;
}

export class SubmitClaimDto {
  @ApiPropertyOptional({ description: 'The principal\'s claim number.' }) @IsOptional() @IsString() @MaxLength(60) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class ReceiveClaimDto {
  @ApiProperty() @IsNumber() @Min(1) amount!: number;
  @ApiProperty({ enum: ['SUPPLIER_KHATA', 'CASH_DRAWER', 'ACCOUNT'], description: 'Set off on the supplier khata, cash in the drawer, or a money account.' })
  @IsIn(['SUPPLIER_KHATA', 'CASH_DRAWER', 'ACCOUNT']) receivedVia!: 'SUPPLIER_KHATA' | 'CASH_DRAWER' | 'ACCOUNT';
  @ApiPropertyOptional() @IsOptional() @IsString() moneyAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD; default today.' }) @IsOptional() @IsString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

/* ───────────── targets ───────────── */

export class SaveTargetDto {
  @ApiProperty({ description: 'YYYY-MM' }) @Matches(PERIOD, { message: 'Mahina "2026-10" ki shakal me dein' }) period!: string;
  @ApiPropertyOptional({ description: 'Booker' }) @IsOptional() @IsString() userId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string | null;
  @ApiPropertyOptional({ description: 'Principal' }) @IsOptional() @IsString() supplierId?: string | null;
  @ApiProperty({ enum: TARGET_METRICS }) @IsIn(TARGET_METRICS) metric!: string;
  @ApiProperty() @IsNumber() @Min(1) target!: number;
  @ApiPropertyOptional({ description: 'QTY: pack name (Carton); empty = base units.' }) @IsOptional() @IsString() @MaxLength(40) unitName?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) note?: string;
}
export class UpdateTargetDto extends PartialType(SaveTargetDto) {}

export class TargetsQueryDto {
  @ApiPropertyOptional({ description: 'YYYY-MM; default this month.' }) @IsOptional() @Matches(PERIOD) period?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
}

export class CopyTargetsDto {
  @ApiProperty() @Matches(PERIOD) from!: string;
  @ApiProperty() @Matches(PERIOD) to!: string;
}

/* ───────────── cheques ───────────── */

export class ListChequesDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional({ enum: ['today', 'week', 'later'], description: 'Open cheques due by today, within 7 days, or later.' })
  @IsOptional() @IsIn(['today', 'week', 'later']) due?: string;
  @ApiPropertyOptional({ description: 'Cheque date from (YYYY-MM-DD).' }) @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

export class ChequeActionDto {
  @ApiPropertyOptional({ description: 'YYYY-MM-DD; default now.' }) @IsOptional() @IsString() date?: string;
  @ApiPropertyOptional({ description: 'Deposit: the bank account it went into.' }) @IsOptional() @IsString() moneyAccountId?: string;
  @ApiPropertyOptional({ description: 'Bounce / cancel: why.' }) @IsOptional() @IsString() @MaxLength(200) reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

/* ───────────── visit analytics ───────────── */

export class VisitAnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'YYYY-MM-DD; default today.' }) @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bookerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
  @ApiPropertyOptional({ description: 'Include the flagged visits list.' }) @IsOptional() @Transform(asBool) @IsBoolean() flags?: boolean;
}
