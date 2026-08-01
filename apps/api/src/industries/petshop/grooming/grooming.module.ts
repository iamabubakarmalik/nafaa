import { Module } from '@nestjs/common';
import { GroomingController } from './grooming.controller';
import { GroomingService } from './grooming.service';

@Module({ controllers: [GroomingController], providers: [GroomingService], exports: [GroomingService] })
export class GroomingModule {}
