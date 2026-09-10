import { Module } from '@nestjs/common';
import { EmiModule } from './emi/emi.module';
import { ImeiModule } from './imei/imei.module';
import { RepairsModule } from './repairs/repairs.module';
import { MobilePosModule } from './pos/mobile-pos.module';
import { MobileReportsModule } from './reports/mobile-reports.module';
import { UsedPhonesModule } from './used-phones/used-phones.module';

@Module({
  imports: [
    EmiModule,
    ImeiModule,
    RepairsModule,
    MobileReportsModule,
    MobilePosModule,
    UsedPhonesModule,
    
  ],
  exports: [
    EmiModule,
    ImeiModule,
    RepairsModule,
    MobileReportsModule,
    MobilePosModule,
    UsedPhonesModule,

  ],
})
export class MobileModule {}
