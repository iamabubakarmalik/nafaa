import { Module } from '@nestjs/common';
import { BirthdayRemindersModule } from './birthday-reminders/birthday-reminders.module';
import { ToystoreDashboardModule } from './dashboard/toystore-dashboard.module';
import { GiftPacksModule } from './gift-packs/gift-packs.module';
import { ToyProductsModule } from './products/products.module';

@Module({
  imports: [
    ToyProductsModule,
    GiftPacksModule,
    BirthdayRemindersModule,
    ToystoreDashboardModule,
  ],
  exports: [
    ToyProductsModule,
    GiftPacksModule,
    BirthdayRemindersModule,
    ToystoreDashboardModule,
  ],
})
export class ToystoreModule {}
