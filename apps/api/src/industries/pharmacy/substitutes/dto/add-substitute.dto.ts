import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddSubstituteDto {
  @ApiProperty() @IsString() mainMedicineId!: string;
  @ApiProperty() @IsString() substituteMedicineId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
}
