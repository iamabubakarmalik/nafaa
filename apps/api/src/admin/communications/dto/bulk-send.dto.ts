import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum SendChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  BOTH = 'BOTH',
}

export enum BulkTarget {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  TRIAL = 'TRIAL',
  SUSPENDED = 'SUSPENDED',
  SPECIFIC = 'SPECIFIC',
}

export class BulkSendDto {
  @ApiProperty({ enum: SendChannel })
  @IsEnum(SendChannel)
  channel!: SendChannel;

  @ApiProperty({ enum: BulkTarget })
  @IsEnum(BulkTarget)
  target!: BulkTarget;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tenantIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailTemplateSlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smsTemplateSlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailSubject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smsMessage?: string;
}
