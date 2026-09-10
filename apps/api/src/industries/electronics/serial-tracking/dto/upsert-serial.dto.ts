import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ElectronicsSerialStatus, ElectronicsWarrantyStatus } from '@prisma/client';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertSerialDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional({ description: 'Kis shop me ye unit para hai' }) @IsOptional() @IsString() shopId?: string;
  @ApiProperty() @IsString() serialNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imei?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imei2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() macAddress?: string;
  @ApiPropertyOptional({ enum: ElectronicsSerialStatus }) @IsOptional() @IsEnum(ElectronicsSerialStatus) status?: ElectronicsSerialStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() purchasePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyEndDate?: string;
  @ApiPropertyOptional({ enum: ElectronicsWarrantyStatus }) @IsOptional() @IsEnum(ElectronicsWarrantyStatus) warrantyStatus?: ElectronicsWarrantyStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() batteryHealthPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() screenCondition?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() physicalCondition?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() functionalStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
}

/** Ek unit — serial ke saath IMEI/MAC bhi ek hi baar me */
export class BulkSerialEntryDto {
  @ApiProperty() @IsString() serialNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imei?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imei2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() macAddress?: string;
}

export class BulkCreateSerialDto {
  @ApiProperty() @IsString() productId!: string;

  @ApiPropertyOptional({ description: 'Kis shop me ye units rakhe hain' })
  @IsOptional() @IsString() shopId?: string;

  /** Purana tareeqa — sirf serial numbers */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() serialNumbers?: string[];

  /**
   * Behtar tareeqa — har unit ka poora data ek hi call me.
   * Pehle IMEI/MAC set karne ke liye har serial par alag search+update
   * chalti thi (N+1) jo fail hone par chup-chaap nikal jati thi.
   */
  @ApiPropertyOptional({ type: [BulkSerialEntryDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BulkSerialEntryDto)
  entries?: BulkSerialEntryDto[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() purchasePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyEndDate?: string;
}

export class SellSerialDto {
  @ApiProperty() @IsNumber() soldPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() soldToCustomerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
}
