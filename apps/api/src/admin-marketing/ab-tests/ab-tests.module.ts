import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AbTestsController } from './ab-tests.controller';
import { AbTestsService } from './ab-tests.service';

@Module({
  imports: [PrismaModule],
  controllers: [AbTestsController],
  providers: [AbTestsService],
  exports: [AbTestsService],
})
export class AbTestsModule {}
