import { Module } from '@nestjs/common';
import { FbrModule } from '../../../integrations/fbr/fbr.module';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';

@Module({
  controllers: [ReturnsController],
  providers: [ReturnsService],
})
export class ReturnsModule {}
