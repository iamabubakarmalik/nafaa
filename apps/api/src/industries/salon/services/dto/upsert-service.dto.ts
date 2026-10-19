import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SalonServiceCategory } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpsertServiceDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) code?: string;
  @ApiPropertyOptional({ enum: SalonServiceCategory }) @IsOptional() @IsEnum(SalonServiceCategory) category?: SalonServiceCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiProperty() @IsNumber() @Min(0) price!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPrice?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costPrice?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(5) @Max(1440) durationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(240) bufferBefore?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(240) bufferAfter?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() forMen?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() forWomen?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() forKids?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) commissionPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) commissionFixed?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) imageUrl?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPopular?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class UpdateServiceDto extends PartialType(UpsertServiceDto) {}
