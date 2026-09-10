import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';

export class CreateTransferItemDto {
  // Used phone bhejte waqt product nahi hota — is liye optional
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({
    description: 'For carpet transfers: specific roll ID being transferred',
  })
  @IsOptional()
  @IsString()
  carpetRollId?: string;

  @ApiPropertyOptional({ description: 'Mobile: kaunsa device bheja ja raha hai (quantity hamesha 1)' })
  @IsOptional()
  @IsString()
  imeiId?: string;

  @ApiPropertyOptional({ description: 'Mobile: used phone bhejne ke liye — iska product nahi hota' })
  @IsOptional()
  @IsString()
  usedPhoneId?: string;

  @ApiPropertyOptional({ description: 'Electronics: kaun sa serial unit ja raha hai (quantity hamesha 1)' })
  @IsOptional()
  @IsString()
  serialId?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTransferDto {
  @ApiProperty()
  @IsString()
  fromShopId!: string;

  @ApiProperty()
  @IsString()
  toShopId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateTransferItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTransferItemDto)
  items!: CreateTransferItemDto[];
}

export class ReceiveTransferDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
