import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class PayoutDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty({ example: '2026-10', description: 'Jis mahine ka hisab' })
  @IsString() @Matches(/^\d{4}-\d{2}$/, { message: 'Mahina "2026-10" ki shakal me dein' })
  period!: string;

  @ApiProperty()
  @IsNumber() @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  note?: string;
}
