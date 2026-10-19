import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateKotDto {
  @ApiProperty() @IsString() orderId!: string;
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @IsString({ each: true }) itemIds!: string[];
  /** Ignored: lines go to the station of their category. Kept so older screens still validate. */
  @ApiPropertyOptional() @IsOptional() @IsString() station?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

export class UpdateKotStatusDto {
  @ApiProperty() @IsString() status!: string;
}
