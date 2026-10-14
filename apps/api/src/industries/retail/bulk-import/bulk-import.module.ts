import { Module } from '@nestjs/common';
import { ProductsModule } from '../../../modules/inventory/products/products.module';
import { BulkImportController } from './bulk-import.controller';
import { BulkImportService } from './bulk-import.service';

@Module({
  imports: [ProductsModule],
  controllers: [BulkImportController],
  providers: [BulkImportService],
})
export class BulkImportModule {}
