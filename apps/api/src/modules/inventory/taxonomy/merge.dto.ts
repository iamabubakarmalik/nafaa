import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Merge one category, brand or tag into another of the same kind. */
export class MergeTaxonomyDto {
  @ApiProperty({ description: 'The item that receives the products' })
  @IsString()
  @IsNotEmpty()
  intoId!: string;
}
