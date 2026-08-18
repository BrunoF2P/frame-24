import { applyDecorators } from '@nestjs/common';
import { Throttle, SkipThrottle as NestSkipThrottle } from '@nestjs/throttler';

export const AuthThrottle = () => Throttle({ auth: { ttl: 60000, limit: 10 } });

export const SignupThrottle = () =>
  Throttle({ signup: { ttl: 60000, limit: 5 } });

export const CustomerSignupThrottle = () =>
  Throttle({ customerSignup: { ttl: 60000, limit: 8 } });

export const ProvisioningThrottle = () =>
  Throttle({ provisioning: { ttl: 60000, limit: 15 } });

const SKIP_ALL_EXCEPT_PUBLIC = NestSkipThrottle({
  default: true,
  auth: true,
  signup: true,
  customerSignup: true,
  provisioning: true,
  write: true,
  checkout: true,
  payment: true,
  privacy: true,
});

export const PublicReadThrottle = () =>
  applyDecorators(
    Throttle({ public: { ttl: 60000, limit: 300 } }),
    SKIP_ALL_EXCEPT_PUBLIC,
  );

export const WriteThrottle = () =>
  Throttle({ write: { ttl: 60000, limit: 30 } });

const SKIP_AGGRESSIVE_THROTTLES = NestSkipThrottle({
  auth: true,
  signup: true,
  customerSignup: true,
  provisioning: true,
  public: true,
  checkout: true,
  payment: true,
  privacy: true,
});

const SKIP_ALL_EXCEPT_PRIVACY = NestSkipThrottle({
  default: true,
  auth: true,
  signup: true,
  customerSignup: true,
  provisioning: true,
  public: true,
  write: true,
  checkout: true,
  payment: true,
});

export const CustomerReadThrottle = () =>
  applyDecorators(
    Throttle({ default: { ttl: 60000, limit: 200 } }),
    SKIP_AGGRESSIVE_THROTTLES,
  );

export const CustomerWriteThrottle = () =>
  applyDecorators(
    Throttle({ write: { ttl: 60000, limit: 60 } }),
    SKIP_AGGRESSIVE_THROTTLES,
  );

export const PrivacyThrottle = () =>
  applyDecorators(
    Throttle({ privacy: { ttl: 60000, limit: 3 } }),
    SKIP_ALL_EXCEPT_PRIVACY,
  );

const SKIP_ALL_EXCEPT_SIGNUP = NestSkipThrottle({
  default: true,
  auth: true,
  provisioning: true,
  public: true,
  write: true,
  checkout: true,
  payment: true,
  privacy: true,
});

const SKIP_ALL_EXCEPT_PROVISIONING = NestSkipThrottle({
  default: true,
  auth: true,
  signup: true,
  customerSignup: true,
  public: true,
  write: true,
  checkout: true,
  payment: true,
  privacy: true,
});

export const CustomerSignupOnlyThrottle = () =>
  applyDecorators(CustomerSignupThrottle(), SKIP_ALL_EXCEPT_SIGNUP);

export const ProvisioningOnlyThrottle = () =>
  applyDecorators(ProvisioningThrottle(), SKIP_ALL_EXCEPT_PROVISIONING);

export const SkipThrottle = NestSkipThrottle;

const SKIP_AGGRESSIVE_AND_PRIVACY = NestSkipThrottle({
  auth: true,
  signup: true,
  customerSignup: true,
  provisioning: true,
  public: true,
  checkout: true,
  payment: true,
  privacy: true,
});

export const EmployeeReadThrottle = () =>
  applyDecorators(
    Throttle({ default: { ttl: 60000, limit: 200 } }),
    SKIP_AGGRESSIVE_AND_PRIVACY,
  );

export const EmployeeWriteThrottle = () =>
  applyDecorators(
    Throttle({ write: { ttl: 60000, limit: 60 } }),
    SKIP_AGGRESSIVE_AND_PRIVACY,
  );
