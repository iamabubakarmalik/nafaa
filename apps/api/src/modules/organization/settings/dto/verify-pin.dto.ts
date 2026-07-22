import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class VerifyPinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @Matches(/^[0-9]{4,6}$/, { message: 'PIN 4-6 digits' })
  pin!: string;
}

export class SetPinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @Matches(/^[0-9]{4,6}$/, { message: 'PIN 4-6 digits' })
  pin!: string;
}

export class RemovePinDto {
  @ApiProperty()
  @IsString()
  currentPin!: string;
}
