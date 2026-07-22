import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DiagnoseDto {
  @ApiProperty()
  @IsString()
  diagnosedIssue!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnosisNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recommendedActions?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  estimatedCost!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  partsCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  laborCost?: number;
}
