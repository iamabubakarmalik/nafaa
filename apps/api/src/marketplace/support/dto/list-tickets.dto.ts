import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { SupportTicketStatus, SupportTicketPriority } from '@prisma/client';

export class ListTicketsDto {
  @IsOptional() @IsArray() @IsEnum(SupportTicketStatus, { each: true })
  status?: SupportTicketStatus[];

  @IsOptional() @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit?: number = 20;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset?: number = 0;
}
