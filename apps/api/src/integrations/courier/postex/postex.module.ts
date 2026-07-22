import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PostExController } from './postex.controller';
import { PostExService } from './postex.service';

@Module({
  imports: [PrismaModule],
  controllers: [PostExController],
  providers: [PostExService],
  exports: [PostExService],
})
export class PostExModule {}
