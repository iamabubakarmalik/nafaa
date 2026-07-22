import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SocialLoginDto {
  @IsString()
  @IsIn(['GOOGLE', 'FACEBOOK', 'APPLE'])
  provider!: 'GOOGLE' | 'FACEBOOK' | 'APPLE';

  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}
