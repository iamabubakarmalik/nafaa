import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiderStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertRiderDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licenseNumber?: string;
  @ApiPropertyOptional({ enum: RiderStatus }) @IsOptional() @IsEnum(RiderStatus) status?: RiderStatus;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEmployee?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() commissionType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() commissionValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() baseSalary?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}