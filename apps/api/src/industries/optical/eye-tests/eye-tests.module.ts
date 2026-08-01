import { Module } from '@nestjs/common';
import { EyeTestsController } from './eye-tests.controller';
import { EyeTestsService } from './eye-tests.service';

@Module({ controllers: [EyeTestsController], providers: [EyeTestsService], exports: [EyeTestsService] })
export class EyeTestsModule {}
