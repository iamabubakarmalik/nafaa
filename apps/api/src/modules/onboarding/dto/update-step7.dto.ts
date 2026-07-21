import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

class TeamMemberDto {
  @IsString() fullName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(6) password!: string;
  @IsIn(['MANAGER', 'CASHIER', 'STAFF']) role!: 'MANAGER' | 'CASHIER' | 'STAFF';
  @IsOptional() @IsString() phone?: string;
}

export class UpdateStep7Dto {
  @ApiPropertyOptional({ type: [TeamMemberDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TeamMemberDto)
  teamMembers?: TeamMemberDto[];
}
