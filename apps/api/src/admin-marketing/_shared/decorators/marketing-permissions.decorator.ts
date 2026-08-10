import { SetMetadata } from '@nestjs/common';
import type { MarketingPermissionKey } from '../constants/marketing-permissions.constants';

export const MARKETING_PERMISSIONS_KEY = 'required_marketing_permissions';
export const RequireMarketingPermissions = (
  ...permissions: MarketingPermissionKey[]
) => SetMetadata(MARKETING_PERMISSIONS_KEY, permissions);
