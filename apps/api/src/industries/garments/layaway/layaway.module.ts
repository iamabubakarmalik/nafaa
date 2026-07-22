import { Module } from '@nestjs/common';
import { LayawayController } from './layaway.controller';
import { LayawayService } from './layaway.service';

@Module({ controllers: [LayawayController], providers: [LayawayService], exports: [LayawayService] })
export class LayawayModule {}
