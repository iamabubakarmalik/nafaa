import { PartialType } from '@nestjs/swagger';
import { CreateEmiPlanDto } from './create-emi-plan.dto';

export class UpdateEmiPlanDto extends PartialType(CreateEmiPlanDto) {}
