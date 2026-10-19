import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DairyDeliverySlot, DairyRouteStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class UpsertRouteDto {
  @ApiProperty() @IsString() @MaxLength(80) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedStaffId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) vehicleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) vehicleNumber?: string;
  @ApiPropertyOptional({ enum: DairyDeliverySlot }) @IsOptional() @IsEnum(DairyDeliverySlot) slot?: DairyDeliverySlot;
  @ApiPropertyOptional({ enum: DairyRouteStatus }) @IsOptional() @IsEnum(DairyRouteStatus) status?: DairyRouteStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Waqt HH:MM likhein' }) startTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(1440) estimatedDurationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) areaName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) color?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

/** Edits send only what changed. */
export class UpdateRouteDto extends PartialType(UpsertRouteDto) {}
