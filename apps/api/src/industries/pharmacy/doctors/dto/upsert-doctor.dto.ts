import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpsertDoctorDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiProperty({ description: 'PMDC number' }) @IsString() @MinLength(2) @MaxLength(40) registrationNumber!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qualification?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specialization?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(70) yearsOfExperience?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() clinicName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clinicAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hospitalAffiliation?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) consultationFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(['NONE', 'PER_PRESCRIPTION', 'PERCENTAGE']) commissionType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) commissionValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVerified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
