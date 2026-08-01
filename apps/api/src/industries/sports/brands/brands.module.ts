import { Module } from '@nestjs/common';
import { SportsBrandsController } from './brands.controller';
import { SportsBrandsService } from './brands.service';

@Module({
  controllers: [SportsBrandsController],
  providers: [SportsBrandsService],
  exports: [SportsBrandsService],
})
export class SportsBrandsModule {}
