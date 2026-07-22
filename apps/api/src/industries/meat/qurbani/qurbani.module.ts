import { Module } from '@nestjs/common';
import { QurbaniController } from './qurbani.controller';
import { QurbaniService } from './qurbani.service';

@Module({ controllers: [QurbaniController], providers: [QurbaniService], exports: [QurbaniService] })
export class QurbaniModule {}
