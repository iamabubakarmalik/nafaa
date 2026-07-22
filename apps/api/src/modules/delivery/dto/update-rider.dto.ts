import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MktRiderStatus, MktRiderVehicleType } from '@prisma/client';

export class UpdateRiderDto {
  @IsOptional() @IsString()
  fullName?: string;

  @IsOptional() @IsString()
  cnic?: string;

  @IsOptional() @IsString()
  vehicleNumber?: string;

  @IsOptional() @IsEnum(MktRiderVehicleType)
  vehicleType?: MktRiderVehicleType;

  @IsOptional() @IsEnum(MktRiderStatus)
  status?: MktRiderStatus;

  @IsOptional() @IsString()
  shopId?: string;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  isVerified?: boolean;
}
