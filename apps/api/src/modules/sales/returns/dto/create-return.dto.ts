import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber,
  IsOptional, IsString, MaxLength, Min, ValidateNested,
} from 'class-validator';

class ReturnItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  saleItemId!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  // ─── Carpet-specific fields ───────────────────────────────
  @ApiPropertyOptional({
    description: 'For carpet returns: create a cut piece from returned material',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  createCutPiece?: boolean;

  @ApiPropertyOptional({
    description: 'Cut piece condition (only for carpet)',
    example: 'Good',
  })
  @IsOptional()
  @IsString()
  cutPieceCondition?: string;

  @ApiPropertyOptional({
    description: 'Mark returned carpet as damaged (creates DAMAGED cut piece)',
  })
  @IsOptional()
  @IsBoolean()
  isDamaged?: boolean;

  @ApiPropertyOptional({
    description: 'Width of returned carpet piece (ft). Defaults to original cut width.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  cutPieceWidthFt?: number;

  @ApiPropertyOptional({
    description: 'Length of returned carpet piece (ft). Defaults to derive from quantity.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  cutPieceLengthFt?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cutPieceNotes?: string;

  @ApiPropertyOptional({
    description: 'Put the goods back on the shelf (default). False books them as damaged.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  restock?: boolean;
}

export class CreateReturnDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  saleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @ApiProperty({ enum: PaymentMethod, example: 'CASH' })
  @IsEnum(PaymentMethod)
  refundMethod!: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];

  /** Owner's PIN, when settings ask for it on refunds. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(12)
  managerPin?: string;
}
