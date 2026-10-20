import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GamingTopupProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTopupDto {
  @ApiProperty({ enum: GamingTopupProvider }) @IsEnum(GamingTopupProvider) provider!: GamingTopupProvider;
  @ApiProperty() @IsString() @MaxLength(60) topupType!: string;
  @ApiProperty() @IsNumber() @Min(0) denominationValue!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() denominationCurrency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cardCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cardPin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cardSerial?: string;
  @ApiProperty() @IsNumber() @Min(0) costPrice!: number;
  @ApiProperty() @IsNumber() @Min(0) sellingPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() regionRestriction?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class BulkCreateTopupDto {
  @ApiProperty({ enum: GamingTopupProvider }) @IsEnum(GamingTopupProvider) provider!: GamingTopupProvider;
  @ApiProperty() @IsString() @MaxLength(60) topupType!: string;
  @ApiProperty() @IsNumber() @Min(0) denominationValue!: number;
  @ApiProperty() @IsNumber() @Min(0) costPrice!: number;
  @ApiProperty() @IsNumber() @Min(0) sellingPrice!: number;
  @ApiProperty({ type: [Object] }) @IsArray() @ArrayMaxSize(500) @Type(() => Object) cards!: Array<{ cardCode: string; cardPin?: string; cardSerial?: string }>;
  @ApiPropertyOptional() @IsOptional() @IsString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierRef?: string;
}

export class SellTopupDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveredVia?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryReference?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) actualSellingPrice?: number;
  /** Money taken for this card; defaults to its selling price. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class AssignSaleDto {
  @ApiProperty() @IsString() saleId!: string;
}

export class RemoveTopupDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) reason?: string;
}
