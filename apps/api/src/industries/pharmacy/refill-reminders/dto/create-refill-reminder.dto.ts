import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRefillReminderDto {
  @ApiProperty() @IsString() customerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prescriptionId?: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(190) medicineName!: string;
  @ApiProperty({ example: '2026-11-01' }) @IsDateString() scheduledFor!: string;
  @ApiPropertyOptional({ enum: ['SMS', 'WHATSAPP', 'CALL', 'EMAIL'] }) @IsOptional() @IsIn(['SMS', 'WHATSAPP', 'CALL', 'EMAIL']) reminderType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
}
