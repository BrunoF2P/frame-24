import { createZodDto } from 'nestjs-zod';
import { CreateCompanySchema } from 'src/modules/identity/companies/dto/company.schema';

const UpdateCompanySchema = CreateCompanySchema.partial();

export class UpdateCompanyDto extends createZodDto(UpdateCompanySchema) {}
