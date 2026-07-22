import { Module } from '@nestjs/common';
import { AlterationsController } from './alterations.controller';
import { AlterationsService } from './alterations.service';

@Module({ controllers: [AlterationsController], providers: [AlterationsService], exports: [AlterationsService] })
export class AlterationsModule {}
