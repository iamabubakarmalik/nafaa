import { Module } from '@nestjs/common';
import { CarpentersController } from './carpenters.controller';
import { CarpentersService } from './carpenters.service';

@Module({ controllers: [CarpentersController], providers: [CarpentersService], exports: [CarpentersService] })
export class CarpentersModule {}
