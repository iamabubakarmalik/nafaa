import { IsString, Length } from 'class-validator';

export class VerifyCustomerEmailDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
