import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { QurbaniController } from './qurbani.controller';
import { QurbaniService } from './qurbani.service';

@Module({ imports: [SalesModule], controllers: [QurbaniController], providers: [QurbaniService], exports: [QurbaniService] })
export class QurbaniModule {}
