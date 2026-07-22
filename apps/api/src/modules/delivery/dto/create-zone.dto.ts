import { Type } from 'class-transformer';
import { IsBoolean, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  name!: string;

  @IsOptional() @IsString()
  description?: string;

  @IsObject()
  polygonGeoJson!: any;

  @Type(() => Number) @Min(0)
  baseFee!: number;

  @Type(() => Number) @Min(0)
  perKmFee!: number;

  @IsOptional() @Type(() => Number) @Min(0)
  freeAbove?: number;

  @IsOptional() @Type(() => Number) @Min(0)
  minOrder?: number;

  @IsOptional() @IsString()
  shopId?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
