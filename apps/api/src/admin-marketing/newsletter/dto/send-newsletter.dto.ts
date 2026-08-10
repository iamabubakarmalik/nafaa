import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class SendNewsletterDto {
  @IsString() @MinLength(3) subject!: string;
  @IsString() @MinLength(10) html!: string;
  @IsOptional() @IsString() preheader?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsArray() @IsString({ each: true })
  subscriberIds?: string[]; // if empty → all ACTIVE
  @IsOptional() @IsBoolean() testMode?: boolean;
  @IsOptional() @IsString() testEmail?: string;
}
