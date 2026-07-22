import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuelType, TransmissionType, VehicleType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpsertCustomerVehicleDto {
  @ApiProperty() @IsString() registrationNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chassisNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() engineNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() makeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() makeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelName?: string;
  @ApiPropertyOptional({ enum: VehicleType }) @IsOptional() @IsEnum(VehicleType) vehicleType?: VehicleType;
  @ApiPropertyOptional() @IsOptional() @IsInt() year?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional({ enum: FuelType }) @IsOptional() @IsEnum(FuelType) fuelType?: FuelType;
  @ApiPropertyOptional({ enum: TransmissionType }) @IsOptional() @IsEnum(TransmissionType) transmission?: TransmissionType;
  @ApiPropertyOptional() @IsOptional() @IsInt() engineCC?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() odometerKm?: number;
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
