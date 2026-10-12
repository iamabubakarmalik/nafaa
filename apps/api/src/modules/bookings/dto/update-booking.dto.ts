import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

/** Reschedule or annotate an open booking. `null` clears a date. */
export class UpdateBookingDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((o) => o.expectedPickupAt !== null)
  @IsDateString()
  expectedPickupAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((o) => o.expiresAt !== null)
  @IsDateString()
  expiresAt?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) internalNotes?: string;
}

/** Mark an open booking ready for pickup, or take the mark back. */
export class MarkReadyDto {
  @IsBoolean()
  ready!: boolean;
}
