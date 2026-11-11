import { Module } from '@nestjs/common';
import { AdminAiUsageController } from './admin-ai-usage.controller';
import { AdminAiUsageService } from './admin-ai-usage.service';

@Module({ controllers: [AdminAiUsageController], providers: [AdminAiUsageService] })
export class AdminAiUsageModule {}
