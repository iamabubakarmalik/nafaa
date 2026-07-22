import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class LoginCustomerDto {
  @IsOptional()
  @IsString()
  @Matches(/^(\+92|0)?3\d{9}$/)
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
