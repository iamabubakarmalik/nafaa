import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum LeadActivityType {
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  DEMO = 'DEMO',
  NOTE = 'NOTE',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
}

export class LogActivityDto {
  @IsEnum(LeadActivityType) type!: LeadActivityType;
  @IsString() summary!: string;
  @IsOptional() @IsString() details?: string;
  @IsOptional() @IsString() outcome?: string;
}
