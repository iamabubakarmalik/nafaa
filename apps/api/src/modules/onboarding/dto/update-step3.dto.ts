import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateStep3Dto {
  @ApiPropertyOptional() @IsOptional() @IsString() shopAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopArea?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopLandmark?: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional() @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  openTime?: string;

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional() @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  closeTime?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true })
  workingDays?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() taxNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
}
