import { Module } from '@nestjs/common';
import { AdminCommunicationsController } from './admin-communications.controller';
import { AdminCommunicationsService } from './admin-communications.service';

@Module({
  controllers: [AdminCommunicationsController],
  providers: [AdminCommunicationsService],
})
export class AdminCommunicationsModule {}
