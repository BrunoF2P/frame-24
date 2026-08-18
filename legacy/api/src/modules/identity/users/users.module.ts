import { Module } from '@nestjs/common';
import { UserManagementController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { UserCreatorService } from './services/user-creator.service';
import { UserMapperService } from './services/user-mapper.service';
import { IdentityRepository } from '../auth/repositories/identity.repository';
import { PersonRepository } from '../auth/repositories/person.repository';
import { CompanyUserRepository } from '../auth/repositories/company-user.repository';
import { CustomRoleRepository } from '../auth/repositories/custom-role.repository';
import { EmployeeIdGeneratorService } from '../auth/services/employee-id-generator';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [UserManagementController],
  providers: [
    UsersService,
    UserCreatorService,
    UserMapperService,
    IdentityRepository,
    PersonRepository,
    CompanyUserRepository,
    CustomRoleRepository,
    EmployeeIdGeneratorService,
  ],
  exports: [UsersService, UserCreatorService, EmployeeIdGeneratorService],
})
export class UsersModule {}
