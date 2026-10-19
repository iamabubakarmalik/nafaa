import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { RepairsController } from './repairs.controller';
import { RepairsService } from './repairs.service';

@Module({ imports: [SalesModule], controllers: [RepairsController], providers: [RepairsService] })
export class RepairsModule {}
