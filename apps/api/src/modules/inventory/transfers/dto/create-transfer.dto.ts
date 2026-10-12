import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
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
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateTransferItemDto)
  items!: CreateTransferItemDto[];
}

export class ReceivedLineDto {
  @IsString() itemId!: string;
  @IsNumber() @Min(0) receivedQty!: number;
}

export class ReceiveTransferDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  /** What actually arrived, per line; lines left out arrived in full. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivedLineDto)
  items?: ReceivedLineDto[];
}

export class CancelTransferDto {
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class ListTransfersDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsIn(['all', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED', 'PENDING']) status?: string;
  /** Relative to the branch in view: goods coming in or going out. */
  @IsOptional() @IsIn(['all', 'in', 'out']) direction?: string;
  @IsOptional() @IsString() shopId?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
