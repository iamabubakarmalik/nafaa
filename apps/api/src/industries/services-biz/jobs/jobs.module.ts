import { Module } from '@nestjs/common';
import { ReturnsModule } from '../../../modules/sales/returns/returns.module';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({ imports: [SalesModule, ReturnsModule], controllers: [JobsController], providers: [JobsService], exports: [JobsService] })
export class JobsModule {}
