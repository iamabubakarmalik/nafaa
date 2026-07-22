import { Module } from '@nestjs/common';
import { WorkshopJobsController } from './workshop-jobs.controller';
import { WorkshopJobsService } from './workshop-jobs.service';

@Module({ controllers: [WorkshopJobsController], providers: [WorkshopJobsService], exports: [WorkshopJobsService] })
export class WorkshopJobsModule {}
