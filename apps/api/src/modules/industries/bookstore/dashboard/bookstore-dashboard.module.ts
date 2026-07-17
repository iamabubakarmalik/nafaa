import { Module } from '@nestjs/common';
import { BookstoreDashboardController } from './bookstore-dashboard.controller';
import { BookstoreDashboardService } from './bookstore-dashboard.service';

@Module({ controllers: [BookstoreDashboardController], providers: [BookstoreDashboardService], exports: [BookstoreDashboardService] })
export class BookstoreDashboardModule {}
