import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('backend chal raha hai — naam aur waqt ke saath', () => {
      const r: any = appController.getHello();
      expect(r).toMatchObject({ success: true, name: 'Nafaa API' });
      expect(typeof r.timestamp).toBe('string');
    });
  });
});
