import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class SkipStepDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(6)
  step!: number;
}
