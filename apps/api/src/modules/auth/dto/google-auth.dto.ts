import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID token from frontend SDK' })
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @ApiProperty({ required: false, description: 'Optional shop name for new users' })
  @IsString()
  shopName?: string;
}
