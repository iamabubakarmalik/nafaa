import { Module } from '@nestjs/common';
import { AdminExportsController } from './admin-exports.controller';
import { AdminExportsService } from './admin-exports.service';

@Module({
  controllers: [AdminExportsController],
  providers: [AdminExportsService],
})
export class AdminExportsModule {}
