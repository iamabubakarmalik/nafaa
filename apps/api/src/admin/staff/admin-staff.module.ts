import { Module } from '@nestjs/common';
import { AdminStaffController } from './admin-staff.controller';
import { AdminStaffService } from './admin-staff.service';

@Module({
  controllers: [AdminStaffController],
  providers: [AdminStaffService],
  exports: [AdminStaffService],
})
export class AdminStaffModule {}
