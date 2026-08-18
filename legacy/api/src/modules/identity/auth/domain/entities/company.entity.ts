export interface CompanyProps {
  id: string;
  corporateName: string;
  tradeName: string | null;
  cnpj: string;
  tenantSlug: string;
  active: boolean;
  zipCode: string | null;
  streetAddress: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
}

export class Company {
  private constructor(private readonly props: CompanyProps) {}

  static create(props: CompanyProps): Company {
    return new Company(props);
  }

  get id(): string {
    return this.props.id;
  }

  get corporateName(): string {
    return this.props.corporateName;
  }

  get tradeName(): string | null {
    return this.props.tradeName;
  }

  get cnpj(): string {
    return this.props.cnpj;
  }

  get tenantSlug(): string {
    return this.props.tenantSlug;
  }

  get active(): boolean {
    return this.props.active;
  }

  // ... outros getters
}
