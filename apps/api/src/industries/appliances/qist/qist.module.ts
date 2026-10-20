import { Module } from '@nestjs/common';
import { QistGuarantorController } from './qist.controller';
import { QistGuarantorService } from './qist.service';

@Module({ controllers: [QistGuarantorController], providers: [QistGuarantorService] })
export class ApplianceQistModule {}
