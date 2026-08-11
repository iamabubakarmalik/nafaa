import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  DEMO_SCHEDULED = 'DEMO_SCHEDULED',
  DEMO_COMPLETED = 'DEMO_COMPLETED',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  NEGOTIATING = 'NEGOTIATING',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
  UNRESPONSIVE = 'UNRESPONSIVE',
  DO_NOT_CONTACT = 'DO_NOT_CONTACT',
}

export enum LeadTemperature {
  COLD = 'COLD',
  WARM = 'WARM',
  HOT = 'HOT',
  FIRE = 'FIRE',
}

export class ListLeadsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsEnum(LeadTemperature) temperature?: LeadTemperature;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() minScore?: number;
  @IsOptional() @Type(() => Number) @IsInt() maxScore?: number;
}
