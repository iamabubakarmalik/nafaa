import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, ValidateNested,
} from 'class-validator';

class TeamMemberDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsIn(['MANAGER', 'CASHIER', 'STAFF'])
  role!: 'MANAGER' | 'CASHIER' | 'STAFF';
}

export class UpdateStep6Dto {
  @ApiPropertyOptional({ type: [TeamMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  teamMembers?: TeamMemberDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  wantsTutorial?: boolean;
}
