import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, RepairPriority } from '@prisma/client';
import { MONEY_METHODS } from '../../../../common/helpers/sale-payments.helper';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional,
  IsString, Length, Matches, MaxLength, Min,
} from 'class-validator';

export class CreateRepairTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(15, 15)
  @Matches(/^\d{15}$/)
  imei1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(15, 15)
  @Matches(/^\d{15}$/)
  imei2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty({ example: 'Apple' })
  @IsString()
  @IsNotEmpty({ message: 'Brand likhein' })
  @MaxLength(60)
  deviceBrand!: string;

  @ApiProperty({ example: 'iPhone 12' })
  @IsString()
  @IsNotEmpty({ message: 'Model likhein' })
  @MaxLength(80)
  deviceModel!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passcode?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasSimCard?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasMemoryCard?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Customer ka naam likhein' })
  @MaxLength(100)
  customerName!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[0-9+\-\s]{7,16}$/, { message: 'Phone number sahi likhein (03XX XXXXXXX)' })
  customerPhone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerCnic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Kharabi likhein' })
  reportedIssue!: string;

  @ApiPropertyOptional({ enum: RepairPriority })
  @IsOptional()
  @IsEnum(RepairPriority)
  priority?: RepairPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  advancePaid?: number;

  @ApiPropertyOptional({ enum: PaymentMethod, description: 'How the advance was paid (default cash)' })
  @IsOptional()
  @IsIn(MONEY_METHODS)
  advanceMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  estimatedReadyAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  technicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  technicianName?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  beforePhotos?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Earlier ticket number when this job is a free redo under its repair warranty' })
  @IsOptional()
  @IsString()
  warrantyOf?: string;

  @ApiPropertyOptional({ default: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyDays?: number;
}
