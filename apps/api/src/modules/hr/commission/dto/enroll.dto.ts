import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class EnrollDto {
  @ApiProperty({ description: 'Jis login ke naam bikri lagti hai' })
  @IsString()
  userId!: string;

  @ApiPropertyOptional({ description: 'HR ka record — diya to login se pakka jur jata hai' })
  @IsOptional() @IsString()
  staffId?: string;

  @ApiProperty({ description: 'true = chaalu, false = band' })
  @IsBoolean()
  isActive!: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  note?: string;
}
