import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GamingConsolePlatform } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertTournamentDto {
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiProperty() @IsString() @MaxLength(80) gameName!: string;
  @ApiProperty({ enum: GamingConsolePlatform }) @IsEnum(GamingConsolePlatform) platform!: GamingConsolePlatform;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) format?: string;
  @ApiProperty() @IsInt() @Min(2) maxParticipants!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) entryFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) prizePool?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) firstPrize?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) secondPrize?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) thirdPrize?: number;
  @ApiProperty() @IsString() scheduledDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduledEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) rules?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class RegisterPlayerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsString() @MaxLength(100) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) phone?: string;
  /** Gamer tag / team name printed on the bill line. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) gamerTag?: string;
  /** Entry fee taken now; the whole fee when left out. */
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
}

export class PayPrizeDto {
  @ApiProperty() @IsString() @MaxLength(100) name!: string;
  @ApiProperty() @IsIn([1, 2, 3, 0]) place!: number;
  @ApiProperty() @IsNumber() @Min(1) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
}

export class CompleteTournamentDto {
  @ApiProperty() @IsString() @MaxLength(100) winnerName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) runnerUpName?: string;
}

export class CancelTournamentDto {
  @ApiProperty() @IsString() @MaxLength(300) reason!: string;
}
