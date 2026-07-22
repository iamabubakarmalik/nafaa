import { IsEmail, IsEnum, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';
import { MktRiderVehicleType } from '@prisma/client';

export class CreateRiderDto {
  @IsString() @Length(2, 100)
  fullName!: string;

  @IsString() @Matches(/^(\+92|0)?3\d{9}$/)
  phone!: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  cnic?: string;

  @IsString() @MinLength(6)
  password!: string;

  @IsEnum(MktRiderVehicleType)
  vehicleType!: MktRiderVehicleType;

  @IsOptional() @IsString()
  vehicleNumber?: string;

  @IsOptional() @IsString()
  licenseNumber?: string;

  @IsOptional() @IsString()
  shopId?: string;
}
