import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ForgotCustomerPasswordDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
