import { Module } from '@nestjs/common';
import { AdminBroadcastController } from './admin-broadcast.controller';
import { AdminBroadcastService } from './admin-broadcast.service';

@Module({
  controllers: [AdminBroadcastController],
  providers: [AdminBroadcastService],
})
export class AdminBroadcastModule {}
