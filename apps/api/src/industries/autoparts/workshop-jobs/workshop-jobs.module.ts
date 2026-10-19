import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { WorkshopJobsController } from './workshop-jobs.controller';
import { WorkshopJobsService } from './workshop-jobs.service';

@Module({ imports: [SalesModule], controllers: [WorkshopJobsController], providers: [WorkshopJobsService], exports: [WorkshopJobsService] })
export class WorkshopJobsModule {}
