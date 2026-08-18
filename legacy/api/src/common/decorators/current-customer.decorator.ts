import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CustomerUser } from 'src/modules/identity/auth/types/auth-user.types';

export const CurrentCustomer = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CustomerUser => {
    const request = ctx.switchToHttp().getRequest<{ user: CustomerUser }>();
    return request.user;
  },
);
