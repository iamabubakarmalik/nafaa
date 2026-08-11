import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ChatStatus {
  ACTIVE = 'ACTIVE',
  BOT_HANDLING = 'BOT_HANDLING',
  WAITING_HUMAN = 'WAITING_HUMAN',
  HUMAN_HANDLING = 'HUMAN_HANDLING',
  RESOLVED = 'RESOLVED',
  ABANDONED = 'ABANDONED',
  ARCHIVED = 'ARCHIVED',
}

export class ListConversationsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsEnum(ChatStatus) status?: ChatStatus;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}
