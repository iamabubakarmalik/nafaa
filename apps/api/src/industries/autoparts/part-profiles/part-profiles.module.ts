import { Module } from '@nestjs/common';
import { PartProfilesController } from './part-profiles.controller';
import { PartProfilesService } from './part-profiles.service';

@Module({ controllers: [PartProfilesController], providers: [PartProfilesService], exports: [PartProfilesService] })
export class PartProfilesModule {}
