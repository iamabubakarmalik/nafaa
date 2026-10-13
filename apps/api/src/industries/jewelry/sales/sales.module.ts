import { Module } from '@nestjs/common';
import { SalesModule as CoreSalesModule } from '../../../modules/sales/sales/sales.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({ imports: [CoreSalesModule], controllers: [SalesController], providers: [SalesService], exports: [SalesService] })
export class SalesModule {}
