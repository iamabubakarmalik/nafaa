import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class UpdateStep5Dto {
  @ApiPropertyOptional({ example: { expiry: true, batches: true, imei: false } })
  @IsOptional() @IsObject()
  enabledFeatures?: Record<string, boolean>;
}
