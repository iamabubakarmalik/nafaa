import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const BUSINESS_TYPES = [
  'CARPET', 'MOBILE', 'GROCERY', 'PHARMACY', 'RESTAURANT',
  'SALON', 'CLOTHING', 'HARDWARE', 'STATIONERY', 'COSMETICS',
  'BAKERY', 'GENERAL',
  'KIRYANA', 'MOBILE_SHOP', 'OTHER',
];

const BUSINESS_SIZES = ['SMALL', 'MEDIUM', 'LARGE'];

export class UpdateStep1Dto {
  @ApiProperty({ enum: BUSINESS_TYPES })
  @IsString()
  @IsIn(BUSINESS_TYPES)
  businessType!: string;

  @ApiProperty({ enum: BUSINESS_SIZES })
  @IsString()
  @IsIn(BUSINESS_SIZES)
  businessSize!: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;
}
