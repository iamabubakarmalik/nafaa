import { PartialType } from '@nestjs/swagger';
import { CreateCarpetRollDto } from './create-carpet-roll.dto';

export class UpdateCarpetRollDto extends PartialType(CreateCarpetRollDto) {}
