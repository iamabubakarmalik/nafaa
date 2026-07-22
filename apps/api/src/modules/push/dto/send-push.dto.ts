import { IsArray, IsOptional, IsString } from 'class-validator';

export class SendPushDto {
  @IsOptional() @IsArray() @IsString({ each: true })
  customerIds?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  tokens?: string[];

  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsOptional() @IsString()
  imageUrl?: string;

  @IsOptional() @IsString()
  actionUrl?: string;

  @IsOptional()
  data?: any;
}
