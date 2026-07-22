import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { CustomerOtpPurpose } from './send-otp.dto';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^(\+92|0)?3\d{9}$/, {
    message: 'Valid Pakistani mobile number chahiye',
  })
  phone!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP 6 digits ka hona chahiye' })
  code!: string;

  @IsEnum(CustomerOtpPurpose)
  purpose!: CustomerOtpPurpose;

  @IsOptional()
  @IsString()
  fullName?: string; // Only required when purpose = REGISTER
}
