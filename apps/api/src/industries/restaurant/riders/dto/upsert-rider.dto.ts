import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { RiderStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpsertRiderDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @ApiProperty() @IsString() @Matches(/^[0-9+\-\s]{7,20}$/, { message: 'Phone number theek likhein (jaise 03001234567)' }) phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licenseNumber?: string;
  @ApiPropertyOptional({ enum: RiderStatus }) @IsOptional() @IsEnum(RiderStatus) status?: RiderStatus;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEmployee?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsIn(['PER_DELIVERY', 'PERCENTAGE', 'FIXED']) commissionType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) commissionValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) baseSalary?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

/** Edits send only what changed (e.g. the status buttons send just `status`). */
export class UpdateRiderDto extends PartialType(UpsertRiderDto) {}

export class RiderLocationDto {
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) lat!: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) lng!: number;
}
