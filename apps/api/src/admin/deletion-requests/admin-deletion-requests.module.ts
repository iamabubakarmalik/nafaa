import { Module } from '@nestjs/common';
import { AdminDeletionRequestsController } from './admin-deletion-requests.controller';
import { AdminDeletionRequestsService } from './admin-deletion-requests.service';

@Module({
  controllers: [AdminDeletionRequestsController],
  providers: [AdminDeletionRequestsService],
})
export class AdminDeletionRequestsModule {}
