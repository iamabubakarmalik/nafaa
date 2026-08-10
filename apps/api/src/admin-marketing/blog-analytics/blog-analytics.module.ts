import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BlogAnalyticsController } from './blog-analytics.controller';
import { BlogAnalyticsService } from './blog-analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [BlogAnalyticsController],
  providers: [BlogAnalyticsService],
  exports: [BlogAnalyticsService],
})
export class BlogAnalyticsModule {}
