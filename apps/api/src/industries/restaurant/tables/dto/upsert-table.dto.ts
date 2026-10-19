import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { RestaurantTableStatus } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpsertTableDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(20) tableNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) tableName?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) minCapacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(200) maxCapacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) section?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() floor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shape?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() positionX?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() positionY?: number;
  @ApiPropertyOptional({ enum: RestaurantTableStatus }) @IsOptional() @IsEnum(RestaurantTableStatus) status?: RestaurantTableStatus;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isReservable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSmokingAllowed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAcRoom?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFamilyArea?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVip?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minOrderAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qrCodeUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

/** Edits send only what changed. */
export class UpdateTableDto extends PartialType(UpsertTableDto) {}

export class ReserveTableDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(80) reservedByName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reservedByPhone?: string;
  @ApiProperty() @IsDateString() reservedFor!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) reservationNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(200) numberOfGuests?: number;
}

export class ChangeTableStatusDto {
  @ApiProperty({ enum: RestaurantTableStatus }) @IsEnum(RestaurantTableStatus) status!: RestaurantTableStatus;
}
