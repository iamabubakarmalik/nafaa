import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateStep2Dto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Invalid WhatsApp number' })
  whatsappNumber?: string;

  @ApiPropertyOptional({ example: '42101-1234567-1' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{5}-?[0-9]{7}-?[0-9]{1}$/, { message: 'Invalid CNIC format' })
  @MaxLength(15)
  cnic?: string;

  @ApiPropertyOptional({ enum: ['ur', 'en', 'roman_ur'] })
  @IsOptional()
  @IsIn(['ur', 'en', 'roman_ur'])
  preferredLanguage?: string;
}
