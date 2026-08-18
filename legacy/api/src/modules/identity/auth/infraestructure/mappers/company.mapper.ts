import { companies } from '@repo/db';
import { Company, CompanyProps } from '../../domain/entities/company.entity';

export class CompanyMapper {
  static toDomain(raw: companies): Company {
    const props: CompanyProps = {
      id: raw.id,
      corporateName: raw.corporate_name,
      tradeName: raw.trade_name,
      cnpj: raw.cnpj,
      tenantSlug: raw.tenant_slug,
      active: raw.active ?? true,
      zipCode: raw.zip_code,
      streetAddress: raw.street_address,
      addressNumber: raw.address_number,
      neighborhood: raw.neighborhood,
      city: raw.city,
      state: raw.state,
      country: raw.country,
      phone: raw.phone,
      email: raw.email,
    };

    return Company.create(props);
  }
}
