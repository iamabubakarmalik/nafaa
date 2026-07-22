import { Module } from '@nestjs/common';
import { SeasonalPlansController } from './seasonal-plans.controller';
import { SeasonalPlansService } from './seasonal-plans.service';

@Module({ controllers: [SeasonalPlansController], providers: [SeasonalPlansService], exports: [SeasonalPlansService] })
export class SeasonalPlansModule {}
