import { Module } from '@nestjs/common';
import { AmcContractsController } from './amc-contracts.controller';
import { AmcContractsService } from './amc-contracts.service';

@Module({ controllers: [AmcContractsController], providers: [AmcContractsService], exports: [AmcContractsService] })
export class AmcContractsModule {}
