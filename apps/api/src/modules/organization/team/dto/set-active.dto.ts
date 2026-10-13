import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class SetActiveDto {
  @ApiPropertyOptional({ description: 'Wanted state; without it the login is flipped' })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
