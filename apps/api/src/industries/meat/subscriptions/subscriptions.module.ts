import { Module } from '@nestjs/common';
import { WeightOrdersModule } from '../weight-orders/weight-orders.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({ imports: [WeightOrdersModule], controllers: [SubscriptionsController], providers: [SubscriptionsService], exports: [SubscriptionsService] })
export class SubscriptionsModule {}
