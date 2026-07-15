import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertDoctorDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() registrationNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qualification?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specialization?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() yearsOfExperience?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() clinicName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clinicAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hospitalAffiliation?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() consultationFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() commissionType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() commissionValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVerified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
