import { Module } from '@nestjs/common';
import { ArtSupplyProfilesModule } from './art-supply-profiles/art-supply-profiles.module';
import { AuthorsModule } from './authors/authors.module';
import { BookProfilesModule } from './book-profiles/book-profiles.module';
import { BookstoreDashboardModule } from './dashboard/bookstore-dashboard.module';
import { PublishersModule } from './publishers/publishers.module';
import { ReadingListsModule } from './reading-lists/reading-lists.module';
import { RentalsModule } from './rentals/rentals.module';
import { SchoolListsModule } from './school-lists/school-lists.module';
import { SchoolsModule } from './schools/schools.module';
import { StationeryProfilesModule } from './stationery-profiles/stationery-profiles.module';

@Module({
  imports: [
    PublishersModule,
    AuthorsModule,
    BookProfilesModule,
    StationeryProfilesModule,
    ArtSupplyProfilesModule,
    SchoolsModule,
    SchoolListsModule,
    RentalsModule,
    ReadingListsModule,
    BookstoreDashboardModule,
  ],
  exports: [
    PublishersModule,
    AuthorsModule,
    BookProfilesModule,
    StationeryProfilesModule,
    ArtSupplyProfilesModule,
    SchoolsModule,
    SchoolListsModule,
    RentalsModule,
    ReadingListsModule,
    BookstoreDashboardModule,
  ],
})
export class BookstoreModule {}
