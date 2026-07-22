import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { MessageChannel } from '@prisma/client';

export class SendMessageDto {
  @IsEnum(MessageChannel) channel!: MessageChannel;
  @IsOptional() @IsArray() @IsString({ each: true }) toPhones?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) toEmails?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) customerIds?: string[];
  @IsOptional() @IsString() templateSlug?: string;
  @IsOptional() @IsString() subject?: string;
  @IsString() body!: string;
  @IsOptional() variables?: any;
}
