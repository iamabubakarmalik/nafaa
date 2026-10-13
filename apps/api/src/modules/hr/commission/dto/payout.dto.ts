import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class PayoutDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty({ example: '2026-10', description: 'Jis mahine ka hisab' })
  @IsString() @Matches(/^\d{4}-\d{2}$/, { message: 'Mahina "2026-10" ki shakal me dein' })
  period!: string;

  @ApiProperty({ description: 'Is mahine ki kul adaigi (pehle se di hui samait)' })
  @IsNumber() @Min(0)
  amount!: number;

  @ApiPropertyOptional({ description: 'Safhe par jo pehle se ada dikh raha tha; beech me kisi ne badla ho to adaigi ruk jati hai' })
  @IsOptional() @IsNumber() @Min(0)
  expectedPaid?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}
