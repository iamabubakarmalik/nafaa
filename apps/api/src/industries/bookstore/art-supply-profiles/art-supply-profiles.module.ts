import { Module } from '@nestjs/common';
import { ArtSupplyProfilesController } from './art-supply-profiles.controller';
import { ArtSupplyProfilesService } from './art-supply-profiles.service';

@Module({ controllers: [ArtSupplyProfilesController], providers: [ArtSupplyProfilesService], exports: [ArtSupplyProfilesService] })
export class ArtSupplyProfilesModule {}
