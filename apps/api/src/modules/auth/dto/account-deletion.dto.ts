import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Asks for the signed-in person's own account to be deleted. */
export class RequestAccountDeletionDto {
  /** Required when the account has a password. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentPassword?: string;

  /** Google-only accounts (no password) type this instead: "DELETE MY ACCOUNT". */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  confirmation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
