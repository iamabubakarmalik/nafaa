import { IsString, Length } from 'class-validator';

export class SendLiveMessageDto {
  @IsString() @Length(1, 500)
  message!: string;
}
