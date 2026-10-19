import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuelType, TransmissionType, VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertCustomerVehicleDto {
  @ApiProperty() @IsOptional() @IsString() registrationNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chassisNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() engineNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() makeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() makeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelName?: string;
  @ApiPropertyOptional({ enum: VehicleType }) @IsOptional() @IsEnum(VehicleType) vehicleType?: VehicleType;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1950) @Max(2100) year?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional({ enum: FuelType }) @IsOptional() @IsEnum(FuelType) fuelType?: FuelType;
  @ApiPropertyOptional({ enum: TransmissionType }) @IsOptional() @IsEnum(TransmissionType) transmission?: TransmissionType;
  @ApiPropertyOptional() @IsOptional() @IsInt() engineCC?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) odometerKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerCnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceProvider?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insurancePolicyNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tokenTaxExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fitnessExpiry?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() documentUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photoUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() preferredMechanicId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ListVehiclesQuery {
  @IsOptional() @IsIn(['all', 'papers', 'regular', 'away', 'inactive']) view?: 'all' | 'papers' | 'regular' | 'away' | 'inactive';
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() makeId?: string;
  @IsOptional() @IsEnum(VehicleType) vehicleType?: VehicleType;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(['true', 'false']) active?: 'true' | 'false';
  @IsOptional() @IsIn(['recent', 'name', 'spent', 'visits']) sort?: 'recent' | 'name' | 'spent' | 'visits';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
