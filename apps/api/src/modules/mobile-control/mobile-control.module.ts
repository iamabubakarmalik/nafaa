import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppearanceModule } from '../appearance/appearance.module';
import { PushModule } from '../push/push.module';
import { MobileAdminController } from './mobile-admin.controller';
import { MobileAnalyticsService } from './mobile-analytics.service';
import { MobileConfigService } from './mobile-config.service';
import { MobileController } from './mobile.controller';
import { MobileDevicesService } from './mobile-devices.service';
import { MobilePushProcessor } from './mobile-push.processor';
import { MobilePushService } from './mobile-push.service';

/** Mobile app control: device check-ins, remote settings, banners and push broadcasts. */
@Module({
  imports: [AppearanceModule, PushModule, JwtModule.register({})],
  controllers: [MobileController, MobileAdminController],
  providers: [MobileConfigService, MobileDevicesService, MobileAnalyticsService, MobilePushService, MobilePushProcessor],
  exports: [MobileConfigService],
})
export class MobileControlModule {}
