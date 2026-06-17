import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';
import { CarpetCutPieceSource, CarpetCutPieceStatus } from '@prisma/client';

export class CreateCutPieceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceRollId?: string;

  @ApiPropertyOptional({ enum: CarpetCutPieceSource })
  @IsOptional()
  @IsEnum(CarpetCutPieceSource)
  sourceType?: CarpetCutPieceSource;

  @ApiPropertyOptional({
    description: 'Leave empty to auto-generate (CP-2026-0001)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  pieceCode?: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(0)
  widthFt!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  widthInch?: number;

  @ApiProperty({ example: 6 })
  @IsNumber()
  @Min(0)
  lengthFt!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthInch?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costAmount?: number;

  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerSqft?: number;

  @ApiPropertyOptional({ enum: CarpetCutPieceStatus })
  @IsOptional()
  @IsEnum(CarpetCutPieceStatus)
  status?: CarpetCutPieceStatus;

  @ApiPropertyOptional({ example: 'Good' })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rackNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
