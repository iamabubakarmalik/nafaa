import { Type } from 'class-transformer';
import { IsIn, IsLatitude, IsLongitude, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateAddressDto {
  @IsString() @Length(1, 50)
  label!: string;

  @IsString() @Length(2, 100)
  fullName!: string;

  @IsString() @Matches(/^(\+92|0)?3\d{9}$/, { message: 'Valid Pakistan mobile number' })
  phone!: string;

  @IsString() @Length(3, 200)
  addressLine1!: string;

  @IsOptional() @IsString()
  addressLine2?: string;

  @IsOptional() @IsString()
  landmark?: string;

  @IsString()
  city!: string;

  @IsString()
  area!: string;

  @IsOptional() @IsString()
  province?: string;

  @IsOptional() @IsString()
  postalCode?: string;

  @IsOptional() @Type(() => Number) @IsLatitude()
  lat?: number;

  @IsOptional() @Type(() => Number) @IsLongitude()
  lng?: number;

  @IsOptional() @IsIn(['HOME', 'OFFICE', 'OTHER'])
  addressType?: 'HOME' | 'OFFICE' | 'OTHER' = 'HOME';

  @IsOptional()
  isDefault?: boolean;

  @IsOptional() @IsString()
  deliveryNotes?: string;
}
