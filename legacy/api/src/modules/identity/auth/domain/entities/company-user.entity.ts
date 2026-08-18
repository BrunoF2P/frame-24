export interface CompanyUserProps {
  id: string;
  identityId: string;
  companyId: string;
  roleId: string;
  employeeId: string;
  active: boolean;
  startDate: Date;
  endDate: Date | null;
  lastAccess: Date | null;
  accessCount: number;
}

export class CompanyUser {
  private constructor(private readonly props: CompanyUserProps) {}

  static create(props: CompanyUserProps): CompanyUser {
    return new CompanyUser(props);
  }

  get id(): string {
    return this.props.id;
  }

  get identityId(): string {
    return this.props.identityId;
  }

  get companyId(): string {
    return this.props.companyId;
  }

  get roleId(): string {
    return this.props.roleId;
  }

  get employeeId(): string {
    return this.props.employeeId;
  }

  get active(): boolean {
    return this.props.active;
  }

  get lastAccess(): Date | null {
    return this.props.lastAccess;
  }

  get accessCount(): number {
    return this.props.accessCount;
  }

  isActive(): boolean {
    return this.props.active && !this.isExpired();
  }

  isExpired(): boolean {
    return this.props.endDate !== null && this.props.endDate < new Date();
  }

  canAccess(): boolean {
    return this.isActive();
  }
}
