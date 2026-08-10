import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ContactFormStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  REPLIED = 'REPLIED',
  RESOLVED = 'RESOLVED',
  SPAM = 'SPAM',
  ARCHIVED = 'ARCHIVED',
}

export enum ContactFormPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class ListFormsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(ContactFormStatus) status?: ContactFormStatus;
  @IsOptional() @IsEnum(ContactFormPriority) priority?: ContactFormPriority;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}
