export enum IdentityEventPattern {
  CREATED = 'identity.created',
  VERIFIED = 'identity.verified',
  PASSWORD_RESET = 'identity.password_reset',
}

export interface IdentityCreatedEventData {
  identity_id: string;
  email: string;
  full_name: string;
  verification_token: string;
}

export interface IdentityVerifiedEventData {
  identity_id: string;
  email: string;
  full_name: string;
}

export interface PasswordResetEventData {
  identity_id: string;
  email: string;
  reset_token: string;
  full_name: string;
}
