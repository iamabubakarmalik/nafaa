import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BedType, RoomType } from '@prisma/client';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

/** One room made with a new room type. */
export class NewRoomDto {
  @IsString() @MaxLength(20) roomNumber!: string;
  @IsOptional() @IsString() @MaxLength(20) floor?: string;
  @IsOptional() @IsString() @MaxLength(60) building?: string;
  @IsOptional() @IsString() @MaxLength(60) wing?: string;
  @IsOptional() @IsString() @MaxLength(60) viewType?: string;
  @IsOptional() @IsString() @MaxLength(60) facing?: string;
  @IsOptional() @IsNumber() @Min(0) customPrice?: number;
  @IsOptional() @IsString() @MaxLength(300) customNotes?: string;
}

/** Room type fields; on update every field is optional. */
export class UpdateRoomTypeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) name?: string;
  @ApiPropertyOptional({ enum: RoomType }) @IsOptional() @IsEnum(RoomType) type?: RoomType;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;

  @IsOptional() @IsInt() @Min(1) @Max(50) maxAdults?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50) maxChildren?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) maxOccupancy?: number;

  @IsOptional() @IsEnum(BedType) bedType?: BedType;
  @IsOptional() @IsInt() @Min(1) @Max(50) bedCount?: number;
  @IsOptional() @IsBoolean() extraBedAllowed?: boolean;
  @IsOptional() @IsNumber() @Min(0) extraBedPrice?: number;

  @IsOptional() @IsNumber() @Min(0) sizeSqft?: number;
  @IsOptional() @IsNumber() @Min(0) sizeSqm?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) basePrice?: number;
  @IsOptional() @IsNumber() @Min(0) weekendPrice?: number | null;
  @IsOptional() @IsNumber() @Min(0) peakPrice?: number | null;
  @IsOptional() @IsNumber() @Min(0) offSeasonPrice?: number | null;
  @IsOptional() @IsNumber() @Min(0) hourlyPrice?: number | null;

  @IsOptional() @IsBoolean() hasAC?: boolean;
  @IsOptional() @IsBoolean() hasHeater?: boolean;
  @IsOptional() @IsBoolean() hasTV?: boolean;
  @IsOptional() @IsBoolean() hasWifi?: boolean;
  @IsOptional() @IsBoolean() hasBalcony?: boolean;
  @IsOptional() @IsBoolean() hasKitchen?: boolean;
  @IsOptional() @IsBoolean() hasBathtub?: boolean;
  @IsOptional() @IsBoolean() hasSafe?: boolean;
  @IsOptional() @IsBoolean() hasMinibar?: boolean;
  @IsOptional() @IsBoolean() isPetFriendly?: boolean;
  @IsOptional() @IsBoolean() isSmoking?: boolean;

  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true }) @MaxLength(60, { each: true }) amenities?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) imageUrls?: string[];

  @IsOptional() @IsInt() displayOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateRoomTypeDto extends UpdateRoomTypeDto {
  /** Rooms of this type, made in the same step. */
  @IsOptional() @IsArray() @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => NewRoomDto) rooms?: NewRoomDto[];
}
