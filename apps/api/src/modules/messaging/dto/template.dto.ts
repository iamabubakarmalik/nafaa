import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { MessageChannel } from '@prisma/client';

export class CreateTemplateDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsEnum(MessageChannel) channel!: MessageChannel;
  @IsOptional() @IsString() subject?: string;
  @IsString() body!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) variables?: string[];
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
