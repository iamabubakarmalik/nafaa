import { Module } from '@nestjs/common';
import { AdminAppearanceController, AppearanceController } from './appearance.controller';
import { AppearanceService } from './appearance.service';

@Module({
  controllers: [AppearanceController, AdminAppearanceController],
  providers: [AppearanceService],
  exports: [AppearanceService],
})
export class AppearanceModule {}
