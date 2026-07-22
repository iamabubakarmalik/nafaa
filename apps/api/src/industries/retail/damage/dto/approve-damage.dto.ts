import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveDamageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectDamageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
