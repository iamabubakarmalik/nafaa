import { Module } from '@nestjs/common';
import { ToyProductsModule } from '../products/products.module';
import { BirthdayRemindersController } from './birthday-reminders.controller';
import { BirthdayRemindersService } from './birthday-reminders.service';

@Module({
  imports: [ToyProductsModule],
  controllers: [BirthdayRemindersController],
  providers: [BirthdayRemindersService],
  exports: [BirthdayRemindersService],
})
export class BirthdayRemindersModule {}
