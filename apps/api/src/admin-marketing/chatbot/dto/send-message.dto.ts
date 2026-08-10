import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString() @MinLength(1) message!: string;
  @IsOptional() @IsBoolean() internal?: boolean; // internal note
}
