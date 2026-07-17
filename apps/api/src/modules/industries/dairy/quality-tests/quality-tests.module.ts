import { Module } from '@nestjs/common';
import { QualityTestsController } from './quality-tests.controller';
import { QualityTestsService } from './quality-tests.service';

@Module({ controllers: [QualityTestsController], providers: [QualityTestsService], exports: [QualityTestsService] })
export class QualityTestsModule {}
