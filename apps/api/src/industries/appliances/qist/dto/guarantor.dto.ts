import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** The guarantor (zamin) who stands for a qist plan. */
export class QistGuarantorDto {
  @ApiProperty() @IsString() @MinLength(2, { message: 'Zamin ka naam likhein' }) @MaxLength(100) guarantorName!: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^(\+?92|0)3\d{2}-?\d{7}$/, { message: 'Zamin ka phone 03XX-XXXXXXX likhein' }) guarantorPhone?: string;
  @ApiProperty() @Matches(/^\d{5}-?\d{7}-?\d$/, { message: 'Zamin ka CNIC 13 hindse (35202-1234567-1)' }) guarantorCnic!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) guarantorAddress?: string;
}
