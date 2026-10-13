import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class SetApprovalPinDto {
  @ApiProperty({ example: '4821', description: '4 to 6 digits' })
  @IsString() @Matches(/^\d{4,8}$/, { message: 'PIN 4 se 8 hindsay ka ho' })
  pin!: string;
}
