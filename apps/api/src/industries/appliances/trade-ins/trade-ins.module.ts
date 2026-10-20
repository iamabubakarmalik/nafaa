import { Module } from '@nestjs/common';
import { ApplianceTradeInsController } from './trade-ins.controller';
import { ApplianceTradeInsService } from './trade-ins.service';

@Module({ controllers: [ApplianceTradeInsController], providers: [ApplianceTradeInsService] })
export class ApplianceTradeInsModule {}
