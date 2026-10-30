/**
 * Request bodies for field and office work: orders, load sheets, settlement,
 * collections, visits and the booker app's sync.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString,
  Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { MONEY_METHODS } from '../../../common/helpers/sale-payments.helper';
import { DELIVERY_OUTCOMES, FIELD_MONEY_METHODS, SYNC_MAX_ITEMS, VISIT_OUTCOMES } from '../distribution.constants';
import { CreateMarketReturnDto } from './market-return.dto';

const bankAlias = ({ value }: { value: unknown }) => (value === 'BANK' ? 'BANK_TRANSFER' : value);

/* ───────────── orders ───────────── */

export class OrderLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string | null;
  @ApiPropertyOptional({ description: 'ProductUnit id (Carton, Dozen); empty for the base unit.' }) @IsOptional() @IsString() unitId?: string | null;
  @ApiProperty({ description: 'Quantity in the pack.' }) @IsNumber() @Min(0.0001) qty!: number;
  @ApiPropertyOptional({ description: 'Price per pack. Kept only with distribution.price_override; otherwise the list price is used.' })
  @IsOptional() @IsNumber() @Min(0) price?: number | null;
  @ApiPropertyOptional({ description: 'Rupees off by hand (only with distribution.price_override).' })
  @IsOptional() @IsNumber() @Min(0) discount?: number | null;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Id made on the phone (uuid). The same clientRef is saved once.' })
  @IsOptional() @IsString() @MaxLength(64) clientRef?: string;
  @ApiProperty() @IsString() @IsNotEmpty() customerId!: string;
  @ApiPropertyOptional({ description: 'Defaults to the customer\'s route.' }) @IsOptional() @IsString() routeId?: string;
  @ApiPropertyOptional({ description: 'Godown; defaults to the route\'s, then the settings default.' }) @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional({ description: 'Booker the order counts for; only with distribution.orders.manage. Defaults to the caller.' })
  @IsOptional() @IsString() bookedById?: string;
  @ApiProperty({ type: [OrderLineDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => OrderLineDto)
  items!: OrderLineDto[];
  @ApiPropertyOptional({ description: 'When booked on the phone (ISO). Defaults to now; never in the future.' })
  @IsOptional() @IsISO8601() bookedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) gpsAccuracy?: number;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD' }) @IsOptional() @IsString() deliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class UpdateOrderDto {
  @ApiPropertyOptional({ type: [OrderLineDto] })
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => OrderLineDto)
  items?: OrderLineDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD; empty clears it.' }) @IsOptional() @IsString() deliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class PreviewOrderDto {
  @ApiProperty() @IsString() @IsNotEmpty() customerId!: string;
  @ApiProperty({ type: [OrderLineDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => OrderLineDto)
  items!: OrderLineDto[];
}

export class ListOrdersDto {
  @ApiPropertyOptional({ description: 'One status or several, comma separated.' }) @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bookedById?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() loadSheetId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD business day (booked).' }) @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional({ description: 'Order number, customer name, phone or business name.' }) @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ description: 'Only orders not on any load sheet (for loading).' })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true' || value === '1') @IsBoolean() unloaded?: boolean;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ default: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

export class OrderIdsDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsString({ each: true }) ids!: string[];
  @ApiPropertyOptional({ description: 'Manager PIN, for customers over the credit limit or overdue.' })
  @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
}

export class CancelOrdersDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsString({ each: true }) ids!: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

/* ───────────── load sheets ───────────── */

export class CreateLoadSheetDto {
  @ApiPropertyOptional({ description: 'YYYY-MM-DD; defaults to today.' }) @IsOptional() @IsString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) vehicleNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiProperty({ type: [String], description: 'Invoiced orders to load (one godown per sheet).' })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsString({ each: true }) orderIds!: string[];
}

export class UpdateLoadSheetDto {
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryUserId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) vehicleNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class LoadSheetOrdersDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsString({ each: true }) orderIds!: string[];
}

export class ListLoadSheetsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional({ description: 'Only sheets given to this delivery user ("me" for the caller).' }) @IsOptional() @IsString() deliveryUserId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

export class SettleLineDto {
  @ApiProperty({ description: 'SalesOrderItem id.' }) @IsString() @IsNotEmpty() orderItemId!: string;
  @ApiPropertyOptional({ description: 'Paid goods coming back, in base units.' }) @IsOptional() @IsNumber() @Min(0) returnBaseQty?: number;
  @ApiPropertyOptional({ description: 'Free goods coming back, in base units.' }) @IsOptional() @IsNumber() @Min(0) returnFreeQty?: number;
  @ApiPropertyOptional({ description: 'Damaged goods are not put back on the shelf.' }) @IsOptional() @IsBoolean() damaged?: boolean;
}

export class SettleOrderDto {
  @ApiProperty() @IsString() @IsNotEmpty() orderId!: string;
  @ApiProperty({ enum: DELIVERY_OUTCOMES }) @IsIn(DELIVERY_OUTCOMES) outcome!: string;
  @ApiPropertyOptional({ type: [SettleLineDto], description: 'PARTIAL only: what came back.' })
  @IsOptional() @IsArray() @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => SettleLineDto) lines?: SettleLineDto[];
  @ApiPropertyOptional({ description: 'Cash (or other money) taken against this invoice at delivery.' })
  @IsOptional() @IsNumber() @Min(0) cashCollected?: number;
  @ApiPropertyOptional({ enum: MONEY_METHODS, default: 'CASH' }) @IsOptional() @Transform(bankAlias) @IsIn(MONEY_METHODS) method?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) returnReason?: string;
}

export class SettleRecoveryDto {
  @ApiProperty() @IsString() @IsNotEmpty() customerId!: string;
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiPropertyOptional({ enum: MONEY_METHODS, default: 'CASH' }) @IsOptional() @Transform(bankAlias) @IsIn(MONEY_METHODS) method?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) reference?: string;
}

export class SettleLoadSheetDto {
  @ApiProperty({ type: [SettleOrderDto] })
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => SettleOrderDto) orders!: SettleOrderDto[];
  @ApiPropertyOptional({ type: [SettleRecoveryDto], description: 'Old-balance money the van brought back.' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => SettleRecoveryDto) recoveries?: SettleRecoveryDto[];
  @ApiPropertyOptional({ description: 'Cash the delivery man handed in. Set on the call that settles the last invoice.' })
  @IsOptional() @IsNumber() @Min(0) handedIn?: number;
  @ApiPropertyOptional({ description: 'Verify the recoveries now (needs distribution.collections.verify).' })
  @IsOptional() @IsBoolean() verifyRecoveries?: boolean;
  @ApiPropertyOptional({ description: 'Manager PIN when the shop asks for one on returns.' })
  @IsOptional() @IsString() @MaxLength(12) managerPin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

/* ───────────── collections ───────────── */

export class CreateCollectionDto {
  @ApiPropertyOptional({ description: 'Id made on the phone; the same clientRef is saved once.' }) @IsOptional() @IsString() @MaxLength(64) clientRef?: string;
  @ApiProperty() @IsString() @IsNotEmpty() customerId!: string;
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiPropertyOptional({ enum: FIELD_MONEY_METHODS, default: 'CASH', description: 'CHEQUE needs bankName, chequeNo and chequeDate.' })
  @IsOptional() @Transform(bankAlias) @IsIn(FIELD_MONEY_METHODS) method?: string;
  @ApiPropertyOptional({ description: 'Cheque: bank name.' }) @IsOptional() @IsString() @MaxLength(80) bankName?: string;
  @ApiPropertyOptional({ description: 'Cheque: number.' }) @IsOptional() @IsString() @MaxLength(40) chequeNo?: string;
  @ApiPropertyOptional({ description: 'Cheque: date written on it (YYYY-MM-DD); later than today = post-dated.' }) @IsOptional() @IsString() chequeDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiPropertyOptional({ description: 'Invoice the money is for (Sale id); empty for an old-balance recovery.' }) @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() loadSheetId?: string;
  @ApiPropertyOptional({ description: 'ISO time collected on the phone.' }) @IsOptional() @IsISO8601() collectedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
}

export class ListCollectionsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() kind?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() collectedById?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() loadSheetId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

export class CollectionIdsDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsString({ each: true }) ids!: string[];
  @ApiPropertyOptional({ description: 'Reject only: why.' }) @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class RecoveriesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
  @ApiPropertyOptional({ description: 'Only customers past their credit days.' })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true' || value === '1') @IsBoolean() overdueOnly?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit?: number;
}

/* ───────────── visits ───────────── */

export class CreateVisitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) clientRef?: string;
  @ApiProperty() @IsString() @IsNotEmpty() customerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
  @ApiPropertyOptional({ description: 'ISO; defaults to now.' }) @IsOptional() @IsISO8601() checkInAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() checkOutAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) accuracyM?: number;
  @ApiProperty({ enum: VISIT_OUTCOMES }) @IsIn(VISIT_OUTCOMES) outcome!: string;
  @ApiPropertyOptional({ description: 'Code from meta.noOrderReasons.' }) @IsOptional() @IsString() @MaxLength(40) noOrderReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salesOrderId?: string;
  @ApiPropertyOptional({ description: 'clientRef of an order synced in the same call or earlier.' }) @IsOptional() @IsString() @MaxLength(64) salesOrderClientRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) photoUrl?: string;
}

export class ListVisitsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() outcome?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

/* ───────────── booker app ───────────── */

export class BootstrapQueryDto {
  @ApiPropertyOptional({ enum: ['customers', 'products', 'priceListItems'], description: 'Empty: the manifest.' })
  @IsOptional() @IsIn(['customers', 'products', 'priceListItems']) entity?: string;
  @ApiPropertyOptional({ description: 'ISO time from the last bootstrap\'s serverTime; only rows changed since.' })
  @IsOptional() @IsISO8601() updatedSince?: string;
  @ApiPropertyOptional({ description: 'nextCursor from the previous page.' }) @IsOptional() @IsString() cursor?: string;
  @ApiPropertyOptional({ default: 500 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit?: number;
  @ApiPropertyOptional({ description: 'priceListItems: which list.' }) @IsOptional() @IsString() priceListId?: string;
  @ApiPropertyOptional({ description: 'Every route instead of the caller\'s own (needs distribution.orders.manage).' })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true' || value === '1') @IsBoolean() all?: boolean;
}

/** Every item must carry its clientRef; an item without one comes back as a conflict. */
export class SyncDto {
  @ApiPropertyOptional({ type: [CreateOrderDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(SYNC_MAX_ITEMS) @ValidateNested({ each: true }) @Type(() => CreateOrderDto) orders?: CreateOrderDto[];
  @ApiPropertyOptional({ type: [CreateVisitDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(SYNC_MAX_ITEMS) @ValidateNested({ each: true }) @Type(() => CreateVisitDto) visits?: CreateVisitDto[];
  @ApiPropertyOptional({ type: [CreateCollectionDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(SYNC_MAX_ITEMS) @ValidateNested({ each: true }) @Type(() => CreateCollectionDto) collections?: CreateCollectionDto[];
  @ApiPropertyOptional({ type: [CreateMarketReturnDto], description: 'Market returns (need distribution.returns.collect); they wait for office approval.' })
  @IsOptional() @IsArray() @ArrayMaxSize(SYNC_MAX_ITEMS) @ValidateNested({ each: true }) @Type(() => CreateMarketReturnDto) returns?: CreateMarketReturnDto[];
}

export class DayQueryDto {
  @ApiPropertyOptional({ description: 'YYYY-MM-DD business day; defaults to today.' }) @IsOptional() @IsString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bookerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
}

export class RangeQueryDto {
  @ApiPropertyOptional({ description: 'YYYY-MM-DD; defaults to the start of this month.' }) @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD; defaults to today.' }) @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bookerId?: string;
}


/* ───────────── delivery app ───────────── */

export class DeliveryReportDto {
  @ApiProperty({ description: 'Id made on the phone (uuid), new for every change of the report.' })
  @IsString() @IsNotEmpty() @MaxLength(64) clientRef!: string;
  @ApiProperty({ description: 'SalesOrder id of the invoice.' }) @IsString() @IsNotEmpty() orderId!: string;
  @ApiProperty({ enum: DELIVERY_OUTCOMES }) @IsIn(DELIVERY_OUTCOMES) outcome!: string;
  @ApiPropertyOptional({ type: [SettleLineDto], description: 'PARTIAL only: what came back, in base units.' })
  @IsOptional() @IsArray() @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => SettleLineDto) lines?: SettleLineDto[];
  @ApiPropertyOptional({ description: 'Money taken against this invoice.' }) @IsOptional() @IsNumber() @Min(0) cashCollected?: number;
  @ApiPropertyOptional({ enum: MONEY_METHODS, default: 'CASH' }) @IsOptional() @Transform(bankAlias) @IsIn(MONEY_METHODS) method?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) returnReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiPropertyOptional({ description: 'Phone time of this report (ISO).' }) @IsOptional() @IsISO8601() reportedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) accuracyM?: number;
}

export class DeliveryRecoveryDto {
  @ApiProperty({ description: 'Id made on the phone (uuid); saved once.' }) @IsString() @IsNotEmpty() @MaxLength(64) clientRef!: string;
  @ApiProperty() @IsString() @IsNotEmpty() loadSheetId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() customerId!: string;
  @ApiProperty() @IsNumber() @Min(0.01) amount!: number;
  @ApiPropertyOptional({ enum: FIELD_MONEY_METHODS, default: 'CASH' }) @IsOptional() @Transform(bankAlias) @IsIn(FIELD_MONEY_METHODS) method?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) chequeNo?: string;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD' }) @IsOptional() @IsString() chequeDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() collectedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
}

export class DeliverySyncDto {
  @ApiPropertyOptional({ type: [DeliveryReportDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(SYNC_MAX_ITEMS) @ValidateNested({ each: true }) @Type(() => DeliveryReportDto) reports?: DeliveryReportDto[];
  @ApiPropertyOptional({ type: [DeliveryRecoveryDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(SYNC_MAX_ITEMS) @ValidateNested({ each: true }) @Type(() => DeliveryRecoveryDto) recoveries?: DeliveryRecoveryDto[];
}
