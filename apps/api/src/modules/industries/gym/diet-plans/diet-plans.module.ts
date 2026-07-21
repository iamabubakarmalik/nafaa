import { Module } from '@nestjs/common';
import { DietPlansController } from './diet-plans.controller';
import { DietPlansService } from './diet-plans.service';

@Module({ controllers: [DietPlansController], providers: [DietPlansService], exports: [DietPlansService] })
export class DietPlansModule {}
