import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { SKIP_ONBOARDING_KEY } from '../decorators/skip-onboarding.decorator';

@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ONBOARDING_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.tenantId) return true; // Not authenticated → let JWT guard handle

    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId: user.tenantId },
      select: { isCompleted: true, currentStep: true },
    });

    if (!progress) {
      throw new ForbiddenException({
        code: 'ONBOARDING_REQUIRED',
        message: 'Onboarding not started',
        redirect: '/onboarding',
      });
    }

    if (!progress.isCompleted) {
      throw new ForbiddenException({
        code: 'ONBOARDING_INCOMPLETE',
        message: 'Please complete onboarding first',
        redirect: `/onboarding?step=${progress.currentStep}`,
        currentStep: progress.currentStep,
      });
    }

    return true;
  }
}
