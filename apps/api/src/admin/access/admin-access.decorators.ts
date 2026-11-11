import { SetMetadata } from '@nestjs/common';

export const ADMIN_AREA_KEY = 'adminArea';
export const ADMIN_PERMISSION_KEY = 'adminPermission';

/**
 * The permission area of an admin controller (or one handler). Reads need
 * '<area>.view', changes need '<area>.manage'. See admin-permissions.ts.
 */
export const AdminArea = (area: string) => SetMetadata(ADMIN_AREA_KEY, area);

/** A specific permission key for one handler, instead of the area default. */
export const AdminPermission = (key: string) => SetMetadata(ADMIN_PERMISSION_KEY, key);
