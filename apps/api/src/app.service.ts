import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      success: true,
      name: 'Nafaa API',
      message: 'Nafaa backend is running',
      timestamp: new Date().toISOString()
    };
  }
}
