/**
 * Owner business deletion: a password is checked when the owner has one; an
 * owner who signs in only with Google or Apple confirms with the typed text.
 */
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { hashPassword } from '../../../../common/utils/password.util';
import { SettingsDangerService } from './settings-danger.service';

const owner = { id: 'u1', tenantId: 't1', role: 'OWNER' } as any;

function setup(passwordHash: string | null) {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ passwordHash })) },
    activityLog: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({})) },
    tenant: { findUnique: jest.fn(async () => ({ status: 'ACTIVE' })), update: jest.fn(async () => ({})) },
  };
  return { prisma, svc: new SettingsDangerService(prisma) };
}

describe('SettingsDangerService.deleteTenant', () => {
  it('lets a passwordless (Google / Apple) owner delete with the typed confirmation', async () => {
    const { svc, prisma } = setup(null);
    await expect(svc.deleteTenant(owner, 'DELETE MY SHOP')).resolves.toMatchObject({ success: true });
    expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { status: 'SUSPENDED' } });
  });

  it('still checks the password when the owner has one', async () => {
    const { svc, prisma } = setup(await hashPassword('Secret@123'));
    await expect(svc.deleteTenant(owner, 'DELETE MY SHOP')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(svc.deleteTenant(owner, 'DELETE MY SHOP', 'wrong-pass')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.tenant.update).not.toHaveBeenCalled();
    await expect(svc.deleteTenant(owner, 'DELETE MY SHOP', 'Secret@123')).resolves.toMatchObject({ success: true });
  });

  it('needs the exact text and an owner', async () => {
    const { svc } = setup(null);
    await expect(svc.deleteTenant(owner, 'delete')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.deleteTenant({ ...owner, role: 'MANAGER' }, 'DELETE MY SHOP')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
