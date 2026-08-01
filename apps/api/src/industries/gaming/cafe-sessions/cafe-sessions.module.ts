import { Module } from '@nestjs/common';
import { CafeSessionsController } from './cafe-sessions.controller';
import { CafeSessionsService } from './cafe-sessions.service';

@Module({ controllers: [CafeSessionsController], providers: [CafeSessionsService], exports: [CafeSessionsService] })
export class CafeSessionsModule {}
