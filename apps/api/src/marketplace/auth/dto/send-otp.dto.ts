import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';

export enum CustomerOtpPurpose {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  VERIFY_PHONE = 'VERIFY_PHONE',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+92|0)?3\d{9}$/, {
    message: 'Valid Pakistani mobile number chahiye (03XX-XXXXXXX)',
  })
  phone!: string;

  @IsEnum(CustomerOtpPurpose)
  purpose!: CustomerOtpPurpose;
}
