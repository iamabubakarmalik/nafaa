import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TableStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertTableDto {
  @ApiProperty() @IsString() tableNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tableName?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() minCapacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() maxCapacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() section?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() floor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shape?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() positionX?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() positionY?: number;
  @ApiPropertyOptional({ enum: TableStatus }) @IsOptional() @IsEnum(TableStatus) status?: TableStatus;
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

export class ReserveTableDto {
  @ApiProperty() @IsString() reservedByName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reservedByPhone?: string;
  @ApiProperty() reservedFor!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reservationNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() numberOfGuests?: number;
}
