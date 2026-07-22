import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RepairPriority, RepairStatus } from '@prisma/client';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional,
  IsString, Length, Matches, Min,
} from 'class-validator';

export class CreateRepairTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(15, 15)
  @Matches(/^\d{15}$/)
  imei1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imei2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty({ example: 'Apple' })
  @IsString()
  deviceBrand!: string;

  @ApiProperty({ example: 'iPhone 12' })
  @IsString()
  deviceModel!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passcode?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasSimCard?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasMemoryCard?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty()
  @IsString()
  customerName!: string;

  @ApiProperty()
  @IsString()
  customerPhone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerCnic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiProperty()
  @IsString()
  reportedIssue!: string;

  @ApiPropertyOptional({ enum: RepairPriority })
  @IsOptional()
  @IsEnum(RepairPriority)
  priority?: RepairPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  advancePaid?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  estimatedReadyAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  technicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  technicianName?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  beforePhotos?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyDays?: number;
}
