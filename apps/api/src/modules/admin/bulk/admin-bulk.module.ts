import { Module } from '@nestjs/common';
import { AdminBulkController } from './admin-bulk.controller';
import { AdminBulkService } from './admin-bulk.service';

@Module({
  controllers: [AdminBulkController],
  providers: [AdminBulkService],
})
export class AdminBulkModule {}
