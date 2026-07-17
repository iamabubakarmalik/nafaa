import { Module } from '@nestjs/common';
import { SlaughterController } from './slaughter.controller';
import { SlaughterService } from './slaughter.service';

@Module({ controllers: [SlaughterController], providers: [SlaughterService], exports: [SlaughterService] })
export class SlaughterModule {}
