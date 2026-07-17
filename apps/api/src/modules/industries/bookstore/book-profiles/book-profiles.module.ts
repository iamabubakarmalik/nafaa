import { Module } from '@nestjs/common';
import { BookProfilesController } from './book-profiles.controller';
import { BookProfilesService } from './book-profiles.service';

@Module({ controllers: [BookProfilesController], providers: [BookProfilesService], exports: [BookProfilesService] })
export class BookProfilesModule {}
