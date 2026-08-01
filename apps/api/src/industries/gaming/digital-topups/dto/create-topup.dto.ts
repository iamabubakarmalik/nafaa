import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GamingTopupProvider } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTopupDto {
  @ApiProperty({ enum: GamingTopupProvider }) @IsEnum(GamingTopupProvider) provider!: GamingTopupProvider;
  @ApiProperty() @IsString() topupType!: string;
  @ApiProperty() @IsNumber() denominationValue!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() denominationCurrency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cardCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cardPin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cardSerial?: string;
  @ApiProperty() @IsNumber() costPrice!: number;
  @ApiProperty() @IsNumber() sellingPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() regionRestriction?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class BulkCreateTopupDto {
  @ApiProperty({ enum: GamingTopupProvider }) @IsEnum(GamingTopupProvider) provider!: GamingTopupProvider;
  @ApiProperty() @IsString() topupType!: string;
  @ApiProperty() @IsNumber() denominationValue!: number;
  @ApiProperty() @IsNumber() costPrice!: number;
  @ApiProperty() @IsNumber() sellingPrice!: number;
  @ApiProperty({ type: [Object] }) @IsArray() cards!: Array<{ cardCode: string; cardPin?: string; cardSerial?: string }>;
  @ApiPropertyOptional() @IsOptional() @IsString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierRef?: string;
}

export class SellTopupDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveredVia?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryReference?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() actualSellingPrice?: number;
}
