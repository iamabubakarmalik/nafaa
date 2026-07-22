import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HardwareProjectStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertProjectDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() customerName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contractorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contractorPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() architectName?: string;
  @ApiProperty() @IsString() siteAddress!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() area?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() siteContactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() builtUpArea?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() floors?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedEndDate?: string;
  @ApiPropertyOptional({ enum: HardwareProjectStatus }) @IsOptional() @IsEnum(HardwareProjectStatus) status?: HardwareProjectStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedBudget?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() creditDays?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() imageUrls?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() documentUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class UpdateProjectStatusDto {
  @ApiProperty({ enum: HardwareProjectStatus }) @IsEnum(HardwareProjectStatus) status!: HardwareProjectStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
