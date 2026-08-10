import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { NewsletterStatus } from './list-subscribers.dto';

export class UpdateSubscriberDto {
  @IsOptional() @IsEnum(NewsletterStatus) status?: NewsletterStatus;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() name?: string;
}
