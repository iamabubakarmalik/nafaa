import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CoreReturnStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

/** An old part the customer hands back. */
export class CoreReturnInputDto {
  @ApiProperty() @IsString() @MaxLength(200) description!: string;
  @ApiProperty() @IsNumber() @IsPositive() value!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
}

export class CreateCoreReturnDto extends CoreReturnInputDto {
  @ApiPropertyOptional() @IsOptional() @IsString() jobId?: string;
}

export class SetCoreStatusDto {
  @ApiProperty({ enum: CoreReturnStatus }) @IsEnum(CoreReturnStatus) status!: CoreReturnStatus;
}

export class ListCoreReturnsQuery {
  @ApiPropertyOptional({ enum: ['HELD', 'SENT_TO_SUPPLIER', 'SCRAPPED', 'all'] }) @IsOptional() @IsIn(['HELD', 'SENT_TO_SUPPLIER', 'SCRAPPED', 'all']) view?: CoreReturnStatus | 'all';
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
