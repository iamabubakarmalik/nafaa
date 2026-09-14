import { Module } from '@nestjs/common';
import { ApplianceWarrantyClaimsController } from './warranty-claims.controller';
import { ApplianceWarrantyClaimsService } from './warranty-claims.service';

@Module({
  controllers: [ApplianceWarrantyClaimsController],
  providers: [ApplianceWarrantyClaimsService],
  exports: [ApplianceWarrantyClaimsService],
})
export class ApplianceWarrantyClaimsModule {}
