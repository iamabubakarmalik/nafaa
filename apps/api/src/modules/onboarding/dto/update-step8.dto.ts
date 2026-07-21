import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateStep8Dto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() wantsTutorial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() subscribedToTips?: boolean;
}
