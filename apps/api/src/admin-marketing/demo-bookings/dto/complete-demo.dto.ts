import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum DemoOutcome {
  CONVERTED = 'CONVERTED',
  INTERESTED = 'INTERESTED',
  NEEDS_FOLLOWUP = 'NEEDS_FOLLOWUP',
  NOT_INTERESTED = 'NOT_INTERESTED',
  WRONG_FIT = 'WRONG_FIT',
}

export class CompleteDemoDto {
  @IsEnum(DemoOutcome) outcome!: DemoOutcome;
  @IsOptional() @IsInt() @Min(1) @Max(10) rating?: number;
  @IsOptional() @IsString() feedback?: string;
  @IsOptional() @IsString() nextStep?: string;
}
