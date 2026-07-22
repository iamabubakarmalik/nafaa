import { Injectable } from '@nestjs/common';
import { SettingsCoreService } from './services/settings-core.service';
import { SettingsSecurityService } from './services/settings-security.service';
import { SettingsIntegrationsService } from './services/settings-integrations.service';
import { SettingsNotificationsService } from './services/settings-notifications.service';
import { SettingsBackupService } from './services/settings-backup.service';
import { SettingsDangerService } from './services/settings-danger.service';

/** Facade that groups all settings sub-services */
@Injectable()
export class SettingsService {
  constructor(
    public readonly core: SettingsCoreService,
    public readonly security: SettingsSecurityService,
    public readonly integrations: SettingsIntegrationsService,
    public readonly notifications: SettingsNotificationsService,
    public readonly backup: SettingsBackupService,
    public readonly danger: SettingsDangerService,
  ) {}
}
