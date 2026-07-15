import { Module } from '@nestjs/common';
import { ControlledLogController } from './controlled-log.controller';
import { ControlledLogService } from './controlled-log.service';

@Module({ controllers: [ControlledLogController], providers: [ControlledLogService], exports: [ControlledLogService] })
export class ControlledLogModule {}
