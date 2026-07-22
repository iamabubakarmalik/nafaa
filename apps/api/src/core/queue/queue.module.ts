import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../../modules/email/email.module';
import { SmsModule } from '../../modules/sms/sms.module';
import { QUEUE_NAMES } from './queue.constants';
import { QueueService } from './queue.service';
import {
  EmailProcessor,
  SmsProcessor,
  PushProcessor,
  WhatsappProcessor,
  NotificationProcessor,
  BargainProcessor,
  AuctionProcessor,
  GroupBuyProcessor,
  CartRecoveryProcessor,
} from './processors';

const QUEUE_LIST: string[] = Object.values(QUEUE_NAMES);

@Global()
@Module({
  imports: [
    PrismaModule,
    EmailModule,
    SmsModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        connection: {
          host: c.get<string>('REDIS_HOST') ?? '127.0.0.1',
          port: +(c.get<string>('REDIS_PORT') ?? '6379'),
          password: c.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 24 * 3600 },
        },
      }),
    }),
    BullModule.registerQueue(...QUEUE_LIST.map((name) => ({ name }))),
  ],
  providers: [
    QueueService,
    EmailProcessor,
    SmsProcessor,
    PushProcessor,
    WhatsappProcessor,
    NotificationProcessor,
    BargainProcessor,
    AuctionProcessor,
    GroupBuyProcessor,
    CartRecoveryProcessor,
  ],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
