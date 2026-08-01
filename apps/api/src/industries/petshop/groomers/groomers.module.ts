import { Module } from '@nestjs/common';
import { GroomersController } from './groomers.controller';
import { GroomersService } from './groomers.service';

@Module({ controllers: [GroomersController], providers: [GroomersService], exports: [GroomersService] })
export class GroomersModule {}
