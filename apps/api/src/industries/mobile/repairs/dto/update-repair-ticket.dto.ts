import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CreateRepairTicketDto } from './create-repair-ticket.dto';

/** Job card edits. The advance and warranty link are set once, at creation. */
export class UpdateRepairTicketDto extends PartialType(OmitType(CreateRepairTicketDto, ['advanceMethod', 'warrantyOf'] as const)) {
  @ApiPropertyOptional({ description: 'Labour charge' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  laborCost?: number;

  @ApiPropertyOptional({ description: 'Discount on the repair bill' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  afterPhotos?: string[];
}
