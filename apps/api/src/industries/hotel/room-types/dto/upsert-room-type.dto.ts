import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BedType, RoomType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertRoomTypeDto {
  @ApiProperty() @IsString() code!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ enum: RoomType }) @IsEnum(RoomType) type!: RoomType;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() maxAdults?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() maxChildren?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() maxOccupancy?: number;

  @ApiPropertyOptional({ enum: BedType }) @IsOptional() @IsEnum(BedType) bedType?: BedType;
  @ApiPropertyOptional() @IsOptional() @IsInt() bedCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() extraBedAllowed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() extraBedPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() sizeSqft?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sizeSqm?: number;

  @ApiProperty() @IsNumber() basePrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weekendPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() peakPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() offSeasonPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() hourlyPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasAC?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasHeater?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasTV?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasWifi?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasBalcony?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasKitchen?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasBathtub?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasSafe?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasMinibar?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPetFriendly?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSmoking?: boolean;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() amenities?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];

  @ApiPropertyOptional() @IsOptional() @IsInt() displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
