import { Module } from '@nestjs/common';
import { LiveAnimalsController } from './live-animals.controller';
import { LiveAnimalsService } from './live-animals.service';

@Module({ controllers: [LiveAnimalsController], providers: [LiveAnimalsService], exports: [LiveAnimalsService] })
export class LiveAnimalsModule {}
