import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from 'src/modules/identity/auth/types/auth-user.types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);
