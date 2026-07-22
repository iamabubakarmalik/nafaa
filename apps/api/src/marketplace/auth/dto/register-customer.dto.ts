import { IsEmail, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterCustomerDto {
  @IsString()
  @Length(2, 100)
  fullName!: string;

  @IsString()
  @Matches(/^(\+92|0)?3\d{9}$/, { message: 'Valid Pakistani mobile number' })
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password kam se kam 6 characters' })
  password?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  language?: string;
}
