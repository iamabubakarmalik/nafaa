import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { CustomerGender } from '@prisma/client';

export class UpdateCustomerProfileDto {
  @IsOptional() @IsString() @Length(2, 100)
  fullName?: string;

  @IsOptional() @IsString()
  displayName?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  avatarUrl?: string;

  @IsOptional() @IsDateString()
  dateOfBirth?: string;

  @IsOptional() @IsEnum(CustomerGender)
  gender?: CustomerGender;

  @IsOptional() @IsString()
  language?: string;

  @IsOptional()
  marketingEmails?: boolean;

  @IsOptional()
  marketingSms?: boolean;

  @IsOptional()
  marketingPush?: boolean;

  @IsOptional()
  marketingWhatsapp?: boolean;
}
