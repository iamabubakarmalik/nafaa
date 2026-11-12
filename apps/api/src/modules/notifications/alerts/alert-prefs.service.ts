/**
 * A person's own notification choices (GET/PATCH /notifications/prefs).
 * One row per user, shared by the web and the mobile app. People without a
 * row see and get the defaults for their role.
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ALERT_SOUNDS } from './alert-catalog';
import { DIGEST_CHOICES, ONLINE_RING_CHOICES, normalizePrefs, storedEvents, prefsView, sanitizePrefsInput, type AlertPerson, type AlertPrefs } from './alert-rules';

@Injectable()
export class AlertPrefsService {
  constructor(private readonly prisma: PrismaService) {}

  private async person(user: AuthenticatedUser): Promise<AlertPerson & { prefs: AlertPrefs }> {
    const row = await this.prisma.user.findFirst({
      where: { id: user.id, tenantId: user.tenantId },
      select: { id: true, role: true, permissions: true, shopId: true, notificationPref: true },
    });
    return {
      id: user.id,
      role: row?.role ?? user.role,
      permissions: row?.permissions ?? user.permissions ?? [],
      shopId: row?.shopId ?? null,
      prefs: normalizePrefs(row?.notificationPref as never),
    };
  }

  private view(p: AlertPerson & { prefs: AlertPrefs }) {
    const { events: _events, ...rest } = p.prefs;
    return {
      ...rest,
      events: prefsView(p, p.prefs),
      sounds: ALERT_SOUNDS,
      digestChoices: DIGEST_CHOICES,
      onlineRingChoices: ONLINE_RING_CHOICES,
    };
  }

  async get(user: AuthenticatedUser) {
    return this.view(await this.person(user));
  }

  async update(user: AuthenticatedUser, body: unknown) {
    const p = await this.person(user);
    const next = sanitizePrefsInput(body, p.prefs);
    const { onlineOrderPopup: _popup, onlineOrderRing: _ring, ...columns } = next;
    const data = { ...columns, events: storedEvents(next) as Prisma.InputJsonValue };
    await this.prisma.userNotificationPref.upsert({
      where: { userId: user.id },
      create: { userId: user.id, tenantId: user.tenantId, ...data },
      update: data,
    });
    return this.view({ ...p, prefs: next });
  }
}
