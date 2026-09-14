import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertBrandDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /* ── Dealer / after-sales ──────────────────────────────────
     Ye fields schema me to thay (ElectronicsBrand merge ke waqt
     aaye) lekin DTO me nahi thay — is liye `forbidNonWhitelisted`
     inhe 400 de kar reject kar deta tha aur koi set hi nahi kar
     sakta tha. Ab poora set yahan hai.                          */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) countryOfOrigin?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() authorizedDealer?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) dealerCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) supportPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) supportEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyPolicy?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) displayOrder?: number;

  /* ── Appliances ───────────────────────────────────────────
     ApplianceBrand ko Brand me milane par aaye (2026-09-14).   */
  @ApiPropertyOptional({ description: 'Brand ka apna service center — pata ya naam' })
  @IsOptional() @IsString() @MaxLength(200) serviceCenter?: string;

  @ApiPropertyOptional({ description: 'Is brand ka maal free lag kar aata hai?' })
  @IsOptional() @IsBoolean() installationIncluded?: boolean;

  @ApiPropertyOptional({ description: 'Demo/chalana sikhana brand ki taraf se shamil hai?' })
  @IsOptional() @IsBoolean() demoIncluded?: boolean;
}
