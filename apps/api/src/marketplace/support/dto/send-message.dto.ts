import { IsArray, IsOptional, IsString, Length } from 'class-validator';

export class SendMessageDto {
  @IsString() @Length(1, 2000)
  message!: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  attachments?: string[];
}
