import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class DeleteTenantDto {
  @ApiProperty({ description: 'Type "DELETE MY SHOP" to confirm' })
  @IsString()
  confirmation!: string;

  @ApiPropertyOptional({ description: 'Required when the owner has a password (Google / Apple only accounts have none)' })
  @IsOptional()
  @IsString()
  currentPassword?: string;
}

export class TransferOwnershipDto {
  @ApiProperty()
  @IsString()
  newOwnerUserId!: string;

  @ApiProperty()
  @IsString()
  currentPassword!: string;
}

export class DataExportDto {
  @ApiProperty({ enum: ['json', 'csv', 'excel'] })
  @IsIn(['json', 'csv', 'excel'])
  format!: 'json' | 'csv' | 'excel';

  @ApiProperty({ isArray: true, type: String })
  @IsString({ each: true })
  entities!: string[]; // e.g. ['products', 'sales', 'customers']
}
