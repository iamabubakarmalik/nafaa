import { ApiPropertyOptional } from '@nestjs/swagger';
import { SalaryType } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CreateTeamMemberDto } from './create-team-member.dto';

/**
 * A login and its HR record in one step. Without `staffId` an HR record is
 * found by email/phone or made new; with it, that record is linked.
 */
export class InviteTeamMemberDto extends CreateTeamMemberDto {
  @ApiPropertyOptional({ description: 'Existing HR record to link to this login' })
  @IsOptional() @IsString()
  staffId?: string;

  @ApiPropertyOptional({ description: 'Job title on the HR record, e.g. "Cashier"' })
  @IsOptional() @IsString() @MaxLength(80)
  designation?: string;

  @ApiPropertyOptional({ enum: SalaryType })
  @IsOptional() @IsEnum(SalaryType)
  salaryType?: SalaryType;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  baseSalary?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  joinDate?: string;

  @ApiPropertyOptional({ description: 'Email the login details to the new member' })
  @IsOptional() @IsBoolean()
  sendEmail?: boolean;
}
