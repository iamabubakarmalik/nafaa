import { Module } from '@nestjs/common';
import { ReorderController } from './reorder.controller';
import { ReorderService } from './reorder.service';

@Module({
  controllers: [ReorderController],
  providers: [ReorderService],
  exports: [ReorderService],
})
export class ReorderModule {}
