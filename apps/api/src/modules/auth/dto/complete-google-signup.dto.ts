import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CompleteGoogleSignupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tempToken!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2, { message: 'Shop ka naam likhein' })
  shopName!: string;
}
