import { Module } from '@nestjs/common';
import { SalonBillsModule } from '../bills/salon-bills.module';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';

@Module({ imports: [SalonBillsModule], controllers: [PackagesController], providers: [PackagesService], exports: [PackagesService] })
export class PackagesModule {}
