import { Module } from '@nestjs/common';
import { SalesModule } from '../../../modules/sales/sales/sales.module';
import { LiveAnimalsController } from './live-animals.controller';
import { LiveAnimalsService } from './live-animals.service';

@Module({ imports: [SalesModule], controllers: [LiveAnimalsController], providers: [LiveAnimalsService], exports: [LiveAnimalsService] })
export class LiveAnimalsModule {}
