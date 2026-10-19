import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { CoreReturnsController } from './core-returns.controller';
import { CoreReturnsService } from './core-returns.service';

@Module({ imports: [SalesModule], controllers: [CoreReturnsController], providers: [CoreReturnsService] })
export class CoreReturnsModule {}
