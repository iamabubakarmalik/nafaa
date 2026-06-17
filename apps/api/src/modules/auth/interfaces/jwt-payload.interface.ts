import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: UserRole;
  shopId?: string | null;
  permissions?: string[];
}

export interface AuthenticatedUser extends JwtPayload {
  id: string;
  shopId: string | null;
  permissions: string[];
}
