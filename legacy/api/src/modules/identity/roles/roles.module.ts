import { Module, Global } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { RolesController } from './controllers/roles.controller';

import { RolesService } from './services/roles.service';
import { PermissionDiscoveryService } from './services/permission-discovery.service';

import { CustomRoleRepository } from './repositories/custom-role.repository';

import { PrismaModule } from 'src/prisma/prisma.module';
import { PermissionsController } from 'src/modules/identity/roles/controllers/permissions.controller';
import { CommonModule } from 'src/common/common.module';

@Global()
@Module({
  imports: [DiscoveryModule, PrismaModule, CommonModule],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService, PermissionDiscoveryService, CustomRoleRepository],
  exports: [RolesService, CustomRoleRepository, PermissionDiscoveryService],
})
export class RolesModule {}
