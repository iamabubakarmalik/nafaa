import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdatePermissionsDto {
  @ApiProperty({
    type: [String],
    example: ['pos.use', 'products.view', 'customers.view'],
  })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
