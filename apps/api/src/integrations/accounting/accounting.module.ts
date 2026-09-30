import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccountingService } from './accounting.service';
import { AccountingController, AccountingPublicController } from './accounting.controller';

/** Zoho Books / QuickBooks / Xero — roz ka summary journal */
@Module({
  imports: [PrismaModule],
  controllers: [AccountingController, AccountingPublicController],
  providers: [AccountingService],
})
export class AccountingModule {}
