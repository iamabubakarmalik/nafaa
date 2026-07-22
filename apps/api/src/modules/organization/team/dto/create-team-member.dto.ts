import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString,
  MaxLength, MinLength,
} from 'class-validator';

export class CreateTeamMemberDto {
  @ApiProperty({ example: 'Bilal Cashier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ example: 'bilal@nafaa.pk' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: 'TempPass@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @ApiProperty({ enum: UserRole, example: 'CASHIER' })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({
    description: 'Assign user to specific shop (required for MANAGER/CASHIER)',
    example: 'shop-uuid-here',
  })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['pos.use', 'products.view'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
