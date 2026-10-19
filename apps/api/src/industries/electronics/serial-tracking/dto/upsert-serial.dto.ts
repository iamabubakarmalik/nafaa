import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ElectronicsConditionType, ElectronicsSerialStatus, ElectronicsWarrantyStatus } from '@prisma/client';
import {
  IsArray, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertSerialDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional({ description: 'Kis shop me ye unit para hai' }) @IsOptional() @IsString() shopId?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) serialNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) imei?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) imei2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) macAddress?: string;
  @ApiPropertyOptional({ enum: ElectronicsSerialStatus }) @IsOptional() @IsEnum(ElectronicsSerialStatus) status?: ElectronicsSerialStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) purchasePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) supplierRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyEndDate?: string;
  @ApiPropertyOptional({ enum: ElectronicsWarrantyStatus }) @IsOptional() @IsEnum(ElectronicsWarrantyStatus) warrantyStatus?: ElectronicsWarrantyStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) batteryHealthPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) screenCondition?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) physicalCondition?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) functionalStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) imageUrls?: string[];
}

/** Ek unit — serial ke saath IMEI/MAC bhi ek hi baar me */
export class BulkSerialEntryDto {
  @ApiProperty() @IsString() @MaxLength(80) serialNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) imei?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) imei2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) macAddress?: string;
}

export class BulkCreateSerialDto {
  @ApiProperty() @IsString() productId!: string;

  @ApiPropertyOptional({ description: 'Kis shop me ye units rakhe hain' })
  @IsOptional() @IsString() shopId?: string;

  /** Purana tareeqa — sirf serial numbers */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) serialNumbers?: string[];

  /** Har unit ka poora data ek hi call me (serial + IMEI + MAC). */
  @ApiPropertyOptional({ type: [BulkSerialEntryDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BulkSerialEntryDto)
  entries?: BulkSerialEntryDto[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) purchasePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) supplierRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyEndDate?: string;
}

export class SellSerialDto {
  @ApiProperty() @IsNumber() @Min(0) soldPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() soldToCustomerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
}

export class ListSerialsDto {
  /** Read by the shop scope; listed so the validator accepts it. */
  @IsOptional() @IsString() shopId?: string;
  @IsOptional() @IsIn(['all', 'stock', 'sold', 'warranty', 'expiring', 'problem', 'tradein']) view?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsIn(['new', 'old', 'warranty', 'cost']) sort?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

/** A used unit bought from a customer, usually against a new purchase. */
export class TradeInDto {
  /** Put the unit under this product; left out, a new used product is made. */
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) serialNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) imei?: string;
  @ApiPropertyOptional({ enum: ElectronicsConditionType }) @IsOptional() @IsEnum(ElectronicsConditionType) condition?: ElectronicsConditionType;
  /** What the shop pays for it. */
  @ApiProperty() @IsNumber() @Min(1) value!: number;
  /** Price to sell it again (new used product only). */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) salePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) physicalCondition?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
