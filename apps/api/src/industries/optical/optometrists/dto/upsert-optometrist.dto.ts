import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertOptometristDto {
  @ApiProperty() @IsString() employeeCode!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() qualification?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() registrationNumber?: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() specializations?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() yearsExperience?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() languages?: string[];

  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() workingDays?: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() workStartTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workEndTime?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() consultationFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() followUpFee?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
}
