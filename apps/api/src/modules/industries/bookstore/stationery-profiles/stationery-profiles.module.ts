import { Module } from '@nestjs/common';
import { StationeryProfilesController } from './stationery-profiles.controller';
import { StationeryProfilesService } from './stationery-profiles.service';

@Module({ controllers: [StationeryProfilesController], providers: [StationeryProfilesService], exports: [StationeryProfilesService] })
export class StationeryProfilesModule {}
