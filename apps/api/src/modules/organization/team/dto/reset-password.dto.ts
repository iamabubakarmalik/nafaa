import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetMemberPasswordDto {
  @ApiProperty({ example: 'Naya@1234' })
  @IsString() @MinLength(8) @MaxLength(64)
  password!: string;
}
