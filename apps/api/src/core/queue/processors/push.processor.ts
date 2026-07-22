import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

/**
 * PushProcessor — dispatches to FCM HTTP v1.
 * If FCM_SERVER_KEY is set (legacy) it uses legacy HTTP API for simplicity.
 * You can swap this for the full HTTP v1 OAuth flow later.
 */
@Processor(QUEUE_NAMES.PUSH)
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);
  private readonly fcmServerKey: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.fcmServerKey = config.get<string>('FCM_SERVER_KEY') ?? '';
  }

  async process(job: Job) {
    const { tokens, title, body, imageUrl, data } = job.data as {
      tokens: string[];
      title: string;
      body: string;
      imageUrl?: string;
      data?: any;
    };

    if (!tokens || tokens.length === 0) return { sent: 0 };
    if (!this.fcmServerKey) {
      this.logger.warn('FCM_SERVER_KEY not set — push send skipped (mock)');
      return { sent: tokens.length, mock: true };
    }

    // FCM legacy HTTP: send in batches (max 500 tokens per multicast)
    const batchSize = 500;
    let sent = 0;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      try {
        const res = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${this.fcmServerKey}`,
          },
          body: JSON.stringify({
            registration_ids: batch,
            notification: {
              title, body,
              image: imageUrl,
              icon: '/icon-192.png',
              click_action: data?.actionUrl,
            },
            data: {
              ...(data ?? {}),
              actionUrl: data?.actionUrl ?? '',
            },
            priority: 'high',
          }),
        });
        const json: any = await res.json();
        sent += json.success ?? 0;
      } catch (e: any) {
        this.logger.error(`FCM batch failed: ${e.message}`);
      }
    }
    this.logger.log(`🔔 Push sent to ${sent}/${tokens.length} tokens`);
    return { sent };
  }
}
