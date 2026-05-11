import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UploadsService } from './uploads.service';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly service: UploadsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @GetUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('purpose') purpose?: string,
  ) {
    return this.service.uploadOne(user, file, purpose || 'misc');
  }

  @Post('multiple')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMany(
    @GetUser() user: AuthenticatedUser,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('purpose') purpose?: string,
  ) {
    return this.service.uploadMany(user, files, purpose || 'misc');
  }

  @Get('mine')
  async listMine(@GetUser() user: AuthenticatedUser) {
    return this.service.findMine(user);
  }

  @Get(':id')
  async findOne(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.findOne(user, id);
  }
}
