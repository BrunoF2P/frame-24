import { forwardRef, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { CompanyModule } from '../companies/company.module';
import { TaxModule } from 'src/modules/tax/tax.module';

import { IdentityRepository } from './repositories/identity.repository';
import { PersonRepository } from './repositories/person.repository';
import { CompanyUserRepository } from './repositories/company-user.repository';
import { CustomRoleRepository } from './repositories/custom-role.repository';
import { CompanyRepository } from '../companies/repositories/company.repository';

import { EmployeeIdGeneratorService } from './services/employee-id-generator';

import { KeycloakJwtStrategy } from './strategies/keycloak-jwt.strategy';
import { PublicAuthController } from './controllers/public-auth.controller';
import { InternalOidcSessionController } from './controllers/internal-oidc-session.controller';
import { PublicRegistrationService } from './services/public-registration.service';
import { OidcSessionService } from './services/oidc-session.service';
import { MasterDataSetupService } from 'src/modules/setup/services/master-data-setup.service';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'keycloak-jwt' }),
    CommonModule,
    forwardRef(() => CompanyModule),
    TaxModule,
  ],
  controllers: [PublicAuthController, InternalOidcSessionController],
  providers: [
    IdentityRepository,
    PersonRepository,
    CompanyUserRepository,
    CustomRoleRepository,
    CompanyRepository,
    EmployeeIdGeneratorService,
    KeycloakJwtStrategy,
    PublicRegistrationService,
    OidcSessionService,
    MasterDataSetupService,
  ],
  exports: [
    IdentityRepository,
    PersonRepository,
    CompanyUserRepository,
    CustomRoleRepository,
    EmployeeIdGeneratorService,
    KeycloakJwtStrategy,
  ],
})
export class AuthModule {}
