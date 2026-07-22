import { IsOptional, IsString } from 'class-validator';

export class AssignOrderDto {
  @IsString()
  orderId!: string;

  @IsOptional() @IsString()
  riderId?: string; // If not provided, auto-assign nearest available
}
