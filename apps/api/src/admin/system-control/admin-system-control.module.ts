import { Module } from '@nestjs/common';
import { AdminSystemControlController } from './admin-system-control.controller';
import { AdminSystemErrorsService } from './admin-system-errors.service';

@Module({ controllers: [AdminSystemControlController], providers: [AdminSystemErrorsService] })
export class AdminSystemControlModule {}
