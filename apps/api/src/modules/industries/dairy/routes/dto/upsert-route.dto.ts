import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DairyDeliverySlot, DairyRouteStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpsertRouteDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedStaffId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleNumber?: string;
  @ApiPropertyOptional({ enum: DairyDeliverySlot }) @IsOptional() @IsEnum(DairyDeliverySlot) slot?: DairyDeliverySlot;
  @ApiPropertyOptional({ enum: DairyRouteStatus }) @IsOptional() @IsEnum(DairyRouteStatus) status?: DairyRouteStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() startTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() estimatedDurationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() areaName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}
