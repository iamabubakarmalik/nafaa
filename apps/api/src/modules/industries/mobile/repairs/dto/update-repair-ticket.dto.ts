import { PartialType } from '@nestjs/swagger';
import { CreateRepairTicketDto } from './create-repair-ticket.dto';

export class UpdateRepairTicketDto extends PartialType(CreateRepairTicketDto) {}
