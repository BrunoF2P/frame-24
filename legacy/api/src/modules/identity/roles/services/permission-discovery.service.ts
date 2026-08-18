import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/services/logger.service';

interface DiscoveredPermission {
  resource: string;
  action: string;
  code: string;
}

@Injectable()
export class PermissionDiscoveryService implements OnModuleInit {
  private readonly retryDelayMs = 5000;
  private syncInProgress = false;

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit(): void {
    this.scheduleSync(1);
  }

  private scheduleSync(attempt: number): void {
    setTimeout(
      () => {
        void this.runSyncWithRetry(attempt);
      },
      attempt === 1 ? 0 : this.retryDelayMs,
    );
  }

  private async runSyncWithRetry(attempt: number): Promise<void> {
    if (this.syncInProgress) {
      this.logger.warn(
        'Permission sync already in progress; skipping overlapping run.',
        PermissionDiscoveryService.name,
      );
      return;
    }

    this.syncInProgress = true;

    try {
      await this.syncAllCompanies();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown startup sync error';

      this.logger.warn(
        `Permission sync failed (attempt ${attempt}): ${message}`,
        PermissionDiscoveryService.name,
      );
      this.logger.warn(
        `Retrying permission sync in ${this.retryDelayMs}ms...`,
        PermissionDiscoveryService.name,
      );
      this.scheduleSync(attempt + 1);
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncAllCompanies(): Promise<void> {
    const companies = await this.prisma.companies.findMany({
      where: { active: true },
      select: { id: true, corporate_name: true },
    });

    this.logger.log(
      `Syncing permissions for ${companies.length} companies...`,
      PermissionDiscoveryService.name,
    );

    const permissions = this.discoverPermissions();

    for (const company of companies) {
      await this.syncCompanyPermissions(company.id, permissions);
    }

    this.logger.log('All companies synced', PermissionDiscoveryService.name);
  }

  async syncCompanyPermissions(
    company_id: string,
    permissions?: DiscoveredPermission[],
  ): Promise<void> {
    const perms = permissions || this.discoverPermissions();

    let created = 0;
    let skipped = 0;

    for (const perm of perms) {
      const existing = await this.prisma.permissions.findFirst({
        where: {
          company_id,
          code: perm.code,
        },
      });

      if (!existing) {
        await this.prisma.permissions.create({
          data: {
            id: `${company_id}_${perm.code.replace(':', '_')}`,
            company_id,
            resource: perm.resource,
            action: perm.action,
            code: perm.code,
            name: this.generateName(perm.resource, perm.action),
            description: this.generateDescription(perm.resource, perm.action),
            module: 'system',
            active: true,
          },
        });
        created++;
      } else {
        skipped++;
      }
    }

    this.logger.log(
      `Company ${company_id}: ${created} created, ${skipped} skipped`,
      PermissionDiscoveryService.name,
    );
  }

  private discoverPermissions(): DiscoveredPermission[] {
    const discovered: DiscoveredPermission[] = [];
    const controllers = this.discoveryService.getControllers();

    for (const wrapper of controllers) {
      const controllerWrapper = wrapper as InstanceWrapper<
        Record<string, unknown>
      >;
      const instance = controllerWrapper.instance;
      const metatype = controllerWrapper.metatype;

      if (!instance || typeof instance !== 'object') continue;
      if (!metatype) continue;

      const prototype = Object.getPrototypeOf(instance) as Record<
        string,
        unknown
      >;
      if (!prototype || typeof prototype !== 'object') continue;

      const methods = this.metadataScanner.getAllMethodNames(prototype);

      for (const methodName of methods) {
        const method = instance[methodName];

        if (typeof method !== 'function') continue;

        const permission = this.reflector.get<string>('permission', method);

        if (permission && typeof permission === 'string') {
          const [resource, action] = permission.split(':');

          if (resource && action) {
            discovered.push({
              resource,
              action,
              code: permission,
            });
          }
        }
      }
    }

    return Array.from(new Map(discovered.map((p) => [p.code, p])).values());
  }

  private generateName(resource: string, action: string): string {
    return `${this.capitalize(action)} ${this.capitalize(resource)}`;
  }

  private generateDescription(resource: string, action: string): string {
    return `${this.capitalize(action)} ${this.capitalize(resource.replace(/_/g, ' '))}`;
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
}
