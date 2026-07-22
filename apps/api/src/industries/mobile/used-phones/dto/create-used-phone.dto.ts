import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PtaStatus, TradeInSource, UsedPhoneCondition, UsedPhoneStatus,
} from '@prisma/client';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional,
  IsString, Length, Matches, Min,
} from 'class-validator';

export class CreateUsedPhoneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiProperty({ example: '123456789012345' })
  @IsString()
  @Length(15, 15)
  @Matches(/^\d{15}$/)
  imei1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(15, 15)
  @Matches(/^\d{15}$/)
  imei2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty({ example: 'Apple' })
  @IsString()
  brand!: string;

  @ApiProperty({ example: 'iPhone 13 Pro' })
  @IsString()
  model!: string;

  @ApiPropertyOptional({ example: '128GB' })
  @IsOptional()
  @IsString()
  storage?: string;

  @ApiPropertyOptional({ example: '6GB' })
  @IsOptional()
  @IsString()
  ram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 2022 })
  @IsOptional()
  @IsInt()
  modelYear?: number;

  @ApiPropertyOptional({ enum: PtaStatus })
  @IsOptional()
  @IsEnum(PtaStatus)
  ptaStatus?: PtaStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  ptaTaxPaid?: number;

  @ApiPropertyOptional({ enum: UsedPhoneCondition })
  @IsOptional()
  @IsEnum(UsedPhoneCondition)
  condition?: UsedPhoneCondition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conditionNotes?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasOriginalBox?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasOriginalCharger?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasOriginalCable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasOriginalEarphones?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasOriginalReceipt?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasWarrantyLeft?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  warrantyExpiryDate?: string;

  @ApiPropertyOptional({ enum: TradeInSource })
  @IsOptional()
  @IsEnum(TradeInSource)
  source?: TradeInSource;

  @ApiProperty({ example: 80000 })
  @IsNumber()
  @Min(0)
  buybackPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  refurbishCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  resalePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromCustomerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromCustomerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromCustomerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromCustomerCnic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnicPhotoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imeiPhotoUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  devicePhotos?: string[];

  @ApiPropertyOptional({ enum: UsedPhoneStatus })
  @IsOptional()
  @IsEnum(UsedPhoneStatus)
  status?: UsedPhoneStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
