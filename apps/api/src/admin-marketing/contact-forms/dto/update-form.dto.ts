import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ContactFormStatus, ContactFormPriority } from './list-forms.dto';

export class UpdateFormDto {
  @IsOptional() @IsEnum(ContactFormStatus) status?: ContactFormStatus;
  @IsOptional() @IsEnum(ContactFormPriority) priority?: ContactFormPriority;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() internalNotes?: string;
  @IsOptional() @IsString() category?: string;
}
