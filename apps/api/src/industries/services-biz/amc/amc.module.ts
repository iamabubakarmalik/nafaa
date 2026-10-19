import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { JobsModule } from '../jobs/jobs.module';
import { AmcController } from './amc.controller';
import { AmcService } from './amc.service';

@Module({ imports: [SalesModule, JobsModule], controllers: [AmcController], providers: [AmcService], exports: [AmcService] })
export class AmcModule {}
