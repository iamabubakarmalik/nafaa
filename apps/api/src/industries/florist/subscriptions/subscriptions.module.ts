import { Module } from '@nestjs/common';
import { FloristSubscriptionsController } from './subscriptions.controller';
import { FloristSubscriptionsService } from './subscriptions.service';
@Module({ controllers: [FloristSubscriptionsController], providers: [FloristSubscriptionsService], exports: [FloristSubscriptionsService] })
export class FloristSubscriptionsModule {}
