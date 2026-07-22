import { IsEnum, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { SupportTicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString() @Length(3, 200)
  subject!: string;

  @IsIn(['ORDER', 'PAYMENT', 'DELIVERY', 'PRODUCT', 'ACCOUNT', 'OTHER'])
  category!: 'ORDER' | 'PAYMENT' | 'DELIVERY' | 'PRODUCT' | 'ACCOUNT' | 'OTHER';

  @IsOptional() @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsOptional() @IsString()
  orderId?: string;

  @IsOptional() @IsString()
  shopId?: string;

  @IsString() @Length(3, 2000)
  message!: string;

  @IsOptional()
  attachments?: string[];
}
