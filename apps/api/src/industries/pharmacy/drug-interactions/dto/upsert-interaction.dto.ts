import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertInteractionDto {
  @ApiProperty() @IsString() saltAId!: string;
  @ApiProperty() @IsString() saltBId!: string;
  @ApiProperty({ enum: ['MINOR', 'MODERATE', 'MAJOR', 'CONTRAINDICATED'] }) @IsIn(['MINOR', 'MODERATE', 'MAJOR', 'CONTRAINDICATED']) severity!: string;
  @ApiProperty() @IsString() @MaxLength(1000) description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clinicalEffect?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() management?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CheckInteractionsDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(60) @IsString({ each: true }) saltIds!: string[];
}
