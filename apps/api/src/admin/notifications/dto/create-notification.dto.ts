import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AdminNotificationPriority,
  AdminNotificationType,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAdminNotificationDto {
  @ApiProperty({ enum: AdminNotificationType })
  @IsEnum(AdminNotificationType)
  type!: AdminNotificationType;

  @ApiPropertyOptional({ enum: AdminNotificationPriority })
  @IsOptional()
  @IsEnum(AdminNotificationPriority)
  priority?: AdminNotificationPriority;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: any;
}
