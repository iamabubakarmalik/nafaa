import { Module } from '@nestjs/common';
import { OptometristsController } from './optometrists.controller';
import { OptometristsService } from './optometrists.service';

@Module({ controllers: [OptometristsController], providers: [OptometristsService], exports: [OptometristsService] })
export class OptometristsModule {}
