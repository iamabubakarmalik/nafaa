import { Module } from '@nestjs/common';
import { AdminPlatformDiscountsController } from './admin-platform-discounts.controller';
import { AdminPlatformDiscountsService } from './admin-platform-discounts.service';

@Module({
  controllers: [AdminPlatformDiscountsController],
  providers: [AdminPlatformDiscountsService],
})
export class AdminPlatformDiscountsModule {}
