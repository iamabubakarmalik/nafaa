import { IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  @IsString()
  @MinLength(6, { message: 'Password kam se kam 6 characters' })
  newPassword!: string;
}
