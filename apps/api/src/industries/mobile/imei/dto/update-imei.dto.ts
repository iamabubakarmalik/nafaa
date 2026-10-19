import { PartialType } from '@nestjs/swagger';
import { CreateImeiDto } from './create-imei.dto';

/**
 * Fields of one phone that can change after it is entered. Product and
 * variant are accepted for older clients but never changed.
 */
export class UpdateImeiDto extends PartialType(CreateImeiDto) {}
