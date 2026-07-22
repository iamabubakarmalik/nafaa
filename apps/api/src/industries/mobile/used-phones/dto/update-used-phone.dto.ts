import { PartialType } from '@nestjs/swagger';
import { CreateUsedPhoneDto } from './create-used-phone.dto';

export class UpdateUsedPhoneDto extends PartialType(CreateUsedPhoneDto) {}
