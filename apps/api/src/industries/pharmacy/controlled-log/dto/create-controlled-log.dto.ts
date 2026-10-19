import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export const CONTROLLED_LOG_TYPES = ['SALE', 'PURCHASE', 'RETURN', 'ADJUSTMENT', 'DAMAGE'] as const;
/** Types that take stock out of the register. */
export const OUTGOING_LOG_TYPES: string[] = ['SALE', 'DAMAGE'];

export class CreateControlledLogDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty({ enum: CONTROLLED_LOG_TYPES }) @IsIn(CONTROLLED_LOG_TYPES as unknown as string[]) logType!: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0.01) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() saleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prescriptionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientCnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorRegNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prescriptionNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dispensedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supervisedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) attachmentUrls?: string[];
}

/** Patient and doctor for a narcotic sold on a bill. */
export class SaleDetailsDto {
  @ApiProperty() @IsString() saleId!: string;
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) patientName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) patientCnic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) patientPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) patientAddress?: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) doctorName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) doctorRegNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) prescriptionNumber?: string;
}
