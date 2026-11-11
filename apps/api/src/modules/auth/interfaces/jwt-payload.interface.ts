import { UserRole } from '@prisma/client';

export interface JwtPayload {
  /** Admin user id when the token came from "sign in as shop". */
  impersonatedBy?: string;
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
