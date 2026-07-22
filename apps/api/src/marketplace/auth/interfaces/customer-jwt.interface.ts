export interface CustomerJwtPayload {
  sub: string;      // customer id
  phone: string;
  email?: string | null;
  fullName: string;
}

export interface AuthenticatedCustomer extends CustomerJwtPayload {
  id: string;
}
