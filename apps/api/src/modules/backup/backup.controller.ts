import { Controller, Get, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { BackupService } from './backup.service';

@ApiTags('Backup')
@ApiBearerAuth()
@Controller('backup')
export class BackupController {
  constructor(private readonly service: BackupService) {}

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser) {
    return this.service.summary(user);
  }

  @Get('history')
  history(@GetUser() user: AuthenticatedUser) {
    return this.service.history(user);
  }

  @Get('download')
  async download(
    @GetUser() user: AuthenticatedUser,
    @Res({ passthrough: false }) res: Response,
  ) {
    const data = await this.service.exportAll(user);
    const json = JSON.stringify(data, null, 2);
    await this.service.logDownload(user, data.counts, Buffer.byteLength(json));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="nafaa-backup-${Date.now()}.json"`,
    );
    res.send(json);
  }
}
