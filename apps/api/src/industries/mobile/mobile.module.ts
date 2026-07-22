import { Module } from '@nestjs/common';
import { EmiModule } from './emi/emi.module';
import { ImeiModule } from './imei/imei.module';
import { RepairsModule } from './repairs/repairs.module';
import { MobileReportsModule } from './reports/mobile-reports.module';
import { UsedPhonesModule } from './used-phones/used-phones.module';

@Module({
  imports: [
    EmiModule,
    ImeiModule,
    RepairsModule,
    MobileReportsModule,
    UsedPhonesModule,
    
  ],
  exports: [
    EmiModule,
    ImeiModule,
    RepairsModule,
    MobileReportsModule,
    UsedPhonesModule,

  ],
})
export class MobileModule {}
