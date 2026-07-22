import { Module } from '@nestjs/common';
import { SaltsController } from './salts.controller';
import { SaltsService } from './salts.service';

@Module({ controllers: [SaltsController], providers: [SaltsService], exports: [SaltsService] })
export class SaltsModule {}
