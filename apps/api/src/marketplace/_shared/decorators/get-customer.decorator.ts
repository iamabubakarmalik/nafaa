import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthenticatedCustomer } from '../../auth/interfaces/customer-jwt.interface';

export const GetCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedCustomer => {
    const req = ctx.switchToHttp().getRequest();
    return req.customer;
  },
);
