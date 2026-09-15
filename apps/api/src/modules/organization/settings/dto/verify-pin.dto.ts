import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString,
  Matches, Max, Min, MinLength,
} from 'class-validator';

/* PIN 4 se 8 hindsay — chhota yaad rehta hai, lamba mehfooz.
   Pehle 4-6 tha jabke frontend 8 tak lene deta tha: 7-8 wala PIN
   set to ho jata tha magar verify par 400 aata tha. */
const PIN = /^[0-9]{4,8}$/;
const PIN_MSG = { message: 'PIN 4 se 8 hindson ka hona chahiye' };

export class VerifyPinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @Matches(PIN, PIN_MSG)
  pin!: string;
}

export class SetPinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @Matches(PIN, PIN_MSG)
  pin!: string;

  /** Agar PIN pehle se laga hua hai to purana PIN lazmi hai */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(PIN, PIN_MSG)
  currentPin?: string;
}

export class RemovePinDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentPin?: string;

  /** PIN bhool gaye — account ka password bhi chalta hai */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;
}

/** PIN bhool gaye — password se naya PIN */
export class ResetPinDto {
  @ApiProperty()
  @IsString()
  @MinLength(6, { message: 'Password poora likhein' })
  password!: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @Matches(PIN, PIN_MSG)
  newPin!: string;
}

/** Kaun se safhe PIN ke baghair na khulein */
export class LockedRoutesDto {
  @ApiProperty({ type: [String], example: ['/khata', '/reports'] })
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  routes!: string[];
}

export class PinPrefsDto {
  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(480)
  unlockMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hideCostByDefault?: boolean;
}
