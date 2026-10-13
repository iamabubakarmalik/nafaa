import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

/** Login details only. Permissions change through their own endpoint. */
export class UpdateTeamMemberDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Empty string removes the phone' })
  @IsOptional() @IsString() @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional() @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'null removes the branch (owner-like access to all branches)' })
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString()
  shopId?: string | null;
}
