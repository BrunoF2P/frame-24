export type OidcSessionContext = 'EMPLOYEE' | 'CUSTOMER';

export class RegisterOidcSessionDto {
  subject!: string;
  session_id!: string;
  context!: OidcSessionContext;
  expires_at?: string;
}

export class CheckOidcSessionDto {
  subject?: string;
  session_id?: string;
}

export class BackchannelLogoutDto {
  logout_token!: string;
  expected_audience!: string;
  issuer?: string;
}
