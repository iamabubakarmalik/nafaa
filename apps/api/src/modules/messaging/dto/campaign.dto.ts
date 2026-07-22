import { IsDateString, IsEnum, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { MessageChannel } from '@prisma/client';

export class CreateCampaignDto {
  @IsString() name!: string;
  @IsEnum(MessageChannel) channel!: MessageChannel;
  @IsOptional() @IsString() templateId?: string;
  @IsIn(['ALL_CUSTOMERS', 'ACTIVE_30D', 'INACTIVE_60D', 'NEW_CUSTOMERS', 'HIGH_VALUE', 'CUSTOM'])
  targetSegment!: string;
  @IsOptional() @IsObject() segmentFilters?: any;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsString() customSubject?: string;
  @IsOptional() @IsString() customBody?: string;
  @IsOptional() @IsObject() variables?: any;
}
