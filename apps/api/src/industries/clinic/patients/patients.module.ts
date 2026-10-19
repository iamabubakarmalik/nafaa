import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PanelsModule } from '../panels/panels.module';

@Module({ imports: [PanelsModule], controllers: [PatientsController], providers: [PatientsService], exports: [PatientsService] })
export class PatientsModule {}
