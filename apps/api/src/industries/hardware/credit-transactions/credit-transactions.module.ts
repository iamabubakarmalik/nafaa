import { Module } from '@nestjs/common';
import { CreditTransactionsController } from './credit-transactions.controller';
import { CreditTransactionsService } from './credit-transactions.service';

@Module({ controllers: [CreditTransactionsController], providers: [CreditTransactionsService], exports: [CreditTransactionsService] })
export class CreditTransactionsModule {}
