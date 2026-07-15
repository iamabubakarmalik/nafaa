import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalonServiceCategory } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertServiceDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional({ enum: SalonServiceCategory }) @IsOptional() @IsEnum(SalonServiceCategory) category?: SalonServiceCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() price!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() durationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bufferBefore?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bufferAfter?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() forMen?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() forWomen?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() forKids?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() commissionPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() commissionFixed?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPopular?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}
