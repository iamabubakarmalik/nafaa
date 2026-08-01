import { Module } from '@nestjs/common';
import { WeddingContractsController } from './wedding-contracts.controller';
import { WeddingContractsService } from './wedding-contracts.service';
@Module({ controllers: [WeddingContractsController], providers: [WeddingContractsService], exports: [WeddingContractsService] })
export class WeddingContractsModule {}
