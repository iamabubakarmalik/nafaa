import { Module } from '@nestjs/common';
import { SportsProductsController } from './products.controller';
import { SportsProductsService } from './products.service';

@Module({
  controllers: [SportsProductsController],
  providers: [SportsProductsService],
  exports: [SportsProductsService],
})
export class SportsProductsModule {}
