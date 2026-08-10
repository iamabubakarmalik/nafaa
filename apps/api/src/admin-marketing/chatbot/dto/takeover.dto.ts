import { IsOptional, IsString } from 'class-validator';

export class TakeoverDto {
  @IsOptional() @IsString() greeting?: string;
}
