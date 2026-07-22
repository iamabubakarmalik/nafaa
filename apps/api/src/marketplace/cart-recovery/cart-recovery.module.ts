import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CartRecoveryController } from './cart-recovery.controller';
import { CartRecoveryService } from './cart-recovery.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [CartRecoveryController],
  providers: [CartRecoveryService],
  exports: [CartRecoveryService],
})
export class CartRecoveryModule {}
