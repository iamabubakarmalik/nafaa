import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ScheduleDemoDto {
  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
