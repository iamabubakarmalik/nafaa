import { IsString } from 'class-validator';

export class VerifyEasypaisaDto {
  @IsString()
  orderRefNum!: string;
}
