import { Module } from '@nestjs/common';
import { CuttingJobsController } from './cutting-jobs.controller';
import { CuttingJobsService } from './cutting-jobs.service';

@Module({ controllers: [CuttingJobsController], providers: [CuttingJobsService], exports: [CuttingJobsService] })
export class CuttingJobsModule {}
