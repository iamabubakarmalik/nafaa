import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ChatStatus {
  BOT = 'BOT',
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  ABANDONED = 'ABANDONED',
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
