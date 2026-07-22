import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpsertInteractionDto {
  @ApiProperty() @IsString() saltAId!: string;
  @ApiProperty() @IsString() saltBId!: string;
  @ApiProperty() @IsString() severity!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clinicalEffect?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() management?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
