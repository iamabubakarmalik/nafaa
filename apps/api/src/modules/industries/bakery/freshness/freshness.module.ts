import { Module } from '@nestjs/common';
import { FreshnessController } from './freshness.controller';
import { FreshnessService } from './freshness.service';

@Module({ controllers: [FreshnessController], providers: [FreshnessService], exports: [FreshnessService] })
export class FreshnessModule {}
