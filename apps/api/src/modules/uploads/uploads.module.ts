import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [
    MulterModule.register({
      // Memory storage — buffer Cloudinary ko stream hota hai
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService, CloudinaryService],
  exports: [UploadsService, CloudinaryService],
})
export class UploadsModule {}
