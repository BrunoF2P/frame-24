export type IdentityType = 'EMPLOYEE' | 'CUSTOMER' | 'ADMIN';
import { identity_type } from '@repo/db';
export interface IdentityProps {
  id: string;
  personId: string | null;
  email: string;
  identityType: identity_type;
  passwordHash: string | null;
  active: boolean;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpiresAt: Date | null;
  failedLoginAttempts: number;
  lastFailedLogin: Date | null;
  blockedUntil: Date | null;
  blockReason: string | null;
  lastLoginDate: Date | null;
  loginCount: number;
  passwordChangedAt: Date | null;
  resetToken: string | null;
  resetTokenExpiresAt: Date | null;
  createdAt: Date;
}

export class Identity {
  private constructor(private readonly props: IdentityProps) {}

  static create(props: IdentityProps): Identity {
    return new Identity(props);
  }

  get id(): string {
    return this.props.id;
  }

  get personId(): string | null {
    return this.props.personId;
  }

  get email(): string {
    return this.props.email;
  }

  get identityType(): identity_type {
    return this.props.identityType;
  }

  get passwordHash(): string | null {
    return this.props.passwordHash;
  }

  get active(): boolean {
    return this.props.active;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  get emailVerificationToken(): string | null {
    return this.props.emailVerificationToken;
  }

  get emailVerificationExpiresAt(): Date | null {
    return this.props.emailVerificationExpiresAt;
  }

  get failedLoginAttempts(): number {
    return this.props.failedLoginAttempts;
  }

  get blockedUntil(): Date | null {
    return this.props.blockedUntil;
  }

  get blockReason(): string | null {
    return this.props.blockReason;
  }

  get lastLoginDate(): Date | null {
    return this.props.lastLoginDate;
  }

  get loginCount(): number {
    return this.props.loginCount;
  }

  get resetToken(): string | null {
    return this.props.resetToken;
  }

  get resetTokenExpiresAt(): Date | null {
    return this.props.resetTokenExpiresAt;
  }

  isBlocked(): boolean {
    return (
      this.props.blockedUntil !== null && this.props.blockedUntil > new Date()
    );
  }

  isVerificationTokenValid(): boolean {
    return (
      this.props.emailVerificationToken !== null &&
      this.props.emailVerificationExpiresAt !== null &&
      this.props.emailVerificationExpiresAt > new Date()
    );
  }

  isResetTokenValid(): boolean {
    return (
      this.props.resetToken !== null &&
      this.props.resetTokenExpiresAt !== null &&
      this.props.resetTokenExpiresAt > new Date()
    );
  }

  recordFailedAttempt(): void {
    this.props.failedLoginAttempts++;
    this.props.lastFailedLogin = new Date();
  }

  shouldBlock(maxAttempts: number): boolean {
    return this.props.failedLoginAttempts >= maxAttempts;
  }

  block(durationMinutes: number): void {
    const blockedUntil = new Date();
    blockedUntil.setMinutes(blockedUntil.getMinutes() + durationMinutes);

    this.props.blockedUntil = blockedUntil;
    this.props.blockReason = `Bloqueado por ${this.props.failedLoginAttempts} tentativas.`;
  }

  resetAttempts(): void {
    this.props.failedLoginAttempts = 0;
    this.props.lastFailedLogin = null;
    this.props.blockedUntil = null;
    this.props.blockReason = null;
  }

  canLogin(): boolean {
    return this.props.active && this.props.emailVerified && !this.isBlocked();
  }
}
