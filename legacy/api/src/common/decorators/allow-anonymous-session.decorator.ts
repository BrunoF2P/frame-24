import { SetMetadata } from '@nestjs/common';

export const ALLOW_ANONYMOUS_SESSION_KEY = 'allowAnonymousSession';

export const AllowAnonymousSession = () =>
  SetMetadata(ALLOW_ANONYMOUS_SESSION_KEY, true);
