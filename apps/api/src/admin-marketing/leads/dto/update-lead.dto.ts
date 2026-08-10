import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { LeadStatus, LeadTemperature } from './list-leads.dto';

export class UpdateLeadDto {
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsEnum(LeadTemperature) temperature?: LeadTemperature;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() companySize?: string;
  @IsOptional() @IsString() budget?: string;
  @IsOptional() @IsString() timeline?: string;
  @IsOptional() @IsBoolean() decisionMaker?: boolean;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() lostReason?: string;
}
