import { Module } from '@nestjs/common';
import { EyeTestsController } from './eye-tests.controller';
import { EyeTestsService } from './eye-tests.service';
import { SalesModule } from '../../../modules/sales/sales/sales.module';

@Module({ imports: [SalesModule], controllers: [EyeTestsController], providers: [EyeTestsService], exports: [EyeTestsService] })
export class EyeTestsModule {}
