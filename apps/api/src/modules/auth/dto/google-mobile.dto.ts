import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleMobileDto {
  @ApiProperty({ description: 'Google ID token from mobile SDK' })
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @ApiPropertyOptional({ description: 'Shop name (required for new users)' })
  @IsOptional()
  @IsString()
  shopName?: string;
}
