import { ApiPropertyOptional } from '@nestjs/swagger';
import { GymAttendanceMethod } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckInDto {
  @ApiPropertyOptional() @IsOptional() @IsString() memberId?: string;
  /** Anything the desk scans or types: member number, card, QR or phone. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) qrCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) rfidCard?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) biometricId?: string;
  @ApiPropertyOptional({ enum: GymAttendanceMethod }) @IsOptional() @IsEnum(GymAttendanceMethod) method?: GymAttendanceMethod;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) entryPoint?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isGuest?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) guestName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) guestPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invitedByMemberId?: string;
  /** Let in although the card is not running; needs a note. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowExpired?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
}
