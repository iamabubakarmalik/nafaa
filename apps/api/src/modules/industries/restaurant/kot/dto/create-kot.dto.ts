import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateKotDto {
  @ApiProperty() @IsString() orderId!: string;
  @ApiProperty({ type: [String] }) @IsArray() itemIds!: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() station?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
