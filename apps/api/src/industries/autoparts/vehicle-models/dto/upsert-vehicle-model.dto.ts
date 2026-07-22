import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpsertVehicleModelDto {
  @ApiProperty() @IsString() makeId!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional({ enum: VehicleType }) @IsOptional() @IsEnum(VehicleType) vehicleType?: VehicleType;
  @ApiPropertyOptional() @IsOptional() @IsInt() yearFrom?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() yearTo?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() engineOptions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
