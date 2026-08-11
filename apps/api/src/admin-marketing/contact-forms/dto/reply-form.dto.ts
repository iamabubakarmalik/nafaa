import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class ReplyFormDto {
  @IsOptional() @IsString() @MinLength(3) subject?: string;
  @IsString() @MinLength(10) message!: string;
  @IsOptional() @IsBoolean() markResolved?: boolean;
  @IsOptional() @IsBoolean() sendSms?: boolean;
}
