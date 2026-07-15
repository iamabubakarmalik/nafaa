import { Module } from '@nestjs/common';
import { TemperatureLogController } from './temperature-log.controller';
import { TemperatureLogService } from './temperature-log.service';

@Module({ controllers: [TemperatureLogController], providers: [TemperatureLogService], exports: [TemperatureLogService] })
export class TemperatureLogModule {}
