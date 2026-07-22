import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { B2BWholesaleController } from './b2b-wholesale.controller';
import { B2BWholesaleService } from './b2b-wholesale.service';

@Module({
  imports: [PrismaModule],
  controllers: [B2BWholesaleController],
  providers: [B2BWholesaleService],
  exports: [B2BWholesaleService],
})
export class B2BWholesaleModule {}
