import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { WarrantyController } from './warranty.controller';
import { WarrantyService } from './warranty.service';

@Module({ imports: [JobsModule], controllers: [WarrantyController], providers: [WarrantyService], exports: [WarrantyService] })
export class WarrantyModule {}
