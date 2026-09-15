import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QuerySuppliersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  /** Sirf wo jin ka baqi chal raha hai / jin ka hisab saaf hai */
  @ApiPropertyOptional({ enum: ['all', 'due', 'clear'] })
  @IsOptional()
  @IsIn(['all', 'due', 'clear'])
  dues?: 'all' | 'due' | 'clear';

  @ApiPropertyOptional({ enum: ['all', 'active', 'inactive'] })
  @IsOptional()
  @IsIn(['all', 'active', 'inactive'])
  status?: 'all' | 'active' | 'inactive';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: ['recent', 'name', 'purchased', 'due', 'orders'] })
  @IsOptional()
  @IsIn(['recent', 'name', 'purchased', 'due', 'orders'])
  sort?: 'recent' | 'name' | 'purchased' | 'due' | 'orders';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
