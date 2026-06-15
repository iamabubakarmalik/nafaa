import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';
import {
  IsDateString, IsEnum, IsOptional, IsString,
} from 'class-validator';

export class MarkAttendanceDto {
  @ApiProperty()
  @IsString()
  staffId!: string;

  @ApiProperty({ example: '2026-06-14' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkInPhotoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkOutPhotoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkInLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkOutLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
