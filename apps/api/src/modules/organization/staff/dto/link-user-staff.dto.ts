import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SalaryType } from '@prisma/client';

/**
 * App user (login) ko HR record se jorna.
 *
 * Do surtein hain aur dono ek hi call se chalti hain:
 *   • `staffId` diya  → maujooda HR record us login se jur jata hai
 *   • `staffId` nahi  → us login ke naam par naya HR record ban jata hai
 */
export class LinkUserStaffDto {
  @ApiPropertyOptional({ description: 'Maujooda HR record — khali to naya ban jayega' })
  @IsOptional() @IsString()
  staffId?: string;

  @ApiPropertyOptional({ description: 'Kaam kya hai — jaise "Cashier"' })
  @IsOptional() @IsString()
  designation?: string;

  @ApiPropertyOptional({ enum: SalaryType })
  @IsOptional() @IsEnum(SalaryType)
  salaryType?: SalaryType;

  @ApiPropertyOptional({ description: 'Mahine ki pakki tankhwah' })
  @IsOptional() @IsNumber() @Min(0)
  baseSalary?: number;
}
