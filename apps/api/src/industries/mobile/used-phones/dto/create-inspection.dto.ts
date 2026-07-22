import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateInspectionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() screenCondition?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bodyCondition?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() cameraWorks?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() speakerWorks?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() microphoneWorks?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() chargingPortWorks?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() buttonsWork?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() faceIdFingerprintWorks?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  batteryHealth?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() imeiUnlocked?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() icloudUnlocked?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() softwareIssues?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() needsRepair?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedRepairCost?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() recommendedActions?: string;
}
