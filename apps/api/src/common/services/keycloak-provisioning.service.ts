import {
  BadGatewayException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import axios from 'axios';

interface CreateKeycloakUserInput {
  email: string;
  fullName: string;
  password: string;
  realmRoles?: string[];
  temporaryPassword?: boolean;
  requiredActions?: string[];
  groups?: string[];
}

@Injectable()
export class KeycloakProvisioningService {
  private resolveBaseUrl(): string {
    const authentikUrl = process.env.AUTHENTIK_URL;
    if (authentikUrl) {
      return authentikUrl.replace(/\/$/, '');
    }

    const issuer =
      process.env.OIDC_ISSUER ||
      process.env.KEYCLOAK_ISSUER ||
      'http://localhost:9080/application/o/frame24-app/';

    const issuerUrl = new URL(issuer);
    return `${issuerUrl.protocol}//${issuerUrl.host}`;
  }

  private getProvisioningConfig(): {
    token: string;
    defaultPath?: string;
  } {
    const enabled =
      (
        process.env.AUTHENTIK_PROVISIONING_ENABLED ||
        process.env.KEYCLOAK_PROVISIONING_ENABLED ||
        'false'
      ).toLowerCase() === 'true';

    if (!enabled) {
      throw new BadGatewayException(
        'Provisioning Authentik desabilitado. Defina AUTHENTIK_PROVISIONING_ENABLED=true para permitir cadastros.',
      );
    }

    const token = process.env.AUTHENTIK_TOKEN;
    if (!token) {
      throw new BadGatewayException(
        'Credenciais de provisioning nao configuradas. Defina AUTHENTIK_TOKEN para usar a API administrativa do Authentik.',
      );
    }

    return {
      token,
      defaultPath: process.env.AUTHENTIK_DEFAULT_USER_PATH,
    };
  }

  private getAdminHeaders(): Record<string, string> {
    const config = this.getProvisioningConfig();
    return {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async ensureGroupIds(groupNames: string[]): Promise<string[]> {
    if (groupNames.length === 0) {
      return [];
    }

    const baseUrl = this.resolveBaseUrl();
    const headers = this.getAdminHeaders();
    const groupIds: string[] = [];

    for (const groupName of groupNames) {
      const existingResponse = await axios.get<{
        results?: Array<{ pk?: string; name?: string }>;
      }>(`${baseUrl}/api/v3/core/groups/`, {
        headers,
        params: { name: groupName },
      });

      const existing = existingResponse.data.results?.find(
        (group) => group.name === groupName,
      );

      if (existing?.pk) {
        groupIds.push(String(existing.pk));
        continue;
      }

      const createdResponse = await axios.post<{ pk?: string }>(
        `${baseUrl}/api/v3/core/groups/`,
        { name: groupName },
        { headers },
      );

      if (!createdResponse.data.pk) {
        throw new BadGatewayException(
          `Nao foi possivel criar o grupo ${groupName} no Authentik.`,
        );
      }

      groupIds.push(String(createdResponse.data.pk));
    }

    return groupIds;
  }

  async createUser(input: CreateKeycloakUserInput): Promise<string> {
    const baseUrl = this.resolveBaseUrl();
    const config = this.getProvisioningConfig();
    const groups = await this.ensureGroupIds(input.groups ?? []);

    const createResponse = await axios.post<{
      pk?: number | string;
      user_pk?: number | string;
      id?: number | string;
      detail?: string;
      username?: string[];
      email?: string[];
      non_field_errors?: string[];
    }>(
      `${baseUrl}/api/v3/core/users/`,
      {
        username: input.email,
        email: input.email,
        name: input.fullName,
        is_active: true,
        ...(groups.length > 0 ? { groups } : {}),
        ...(config.defaultPath ? { path: config.defaultPath } : {}),
      },
      {
        headers: this.getAdminHeaders(),
        validateStatus: (status) =>
          status === 201 || status === 400 || status === 409,
      },
    );

    if (createResponse.status === 409 || createResponse.status === 400) {
      throw new ConflictException(
        'Email ja cadastrado no provedor de autenticacao.',
      );
    }

    const userId = String(
      createResponse.data.pk ??
        createResponse.data.user_pk ??
        createResponse.data.id ??
        '',
    );

    if (!userId) {
      throw new BadGatewayException(
        'Nao foi possivel obter ID do usuario criado no Authentik.',
      );
    }

    await axios.post(
      `${baseUrl}/api/v3/core/users/${userId}/set_password/`,
      {
        password: input.password,
      },
      {
        headers: this.getAdminHeaders(),
      },
    );

    return userId;
  }

  async deleteUser(userId: string): Promise<void> {
    const baseUrl = this.resolveBaseUrl();

    await axios.delete(`${baseUrl}/api/v3/core/users/${userId}/`, {
      headers: this.getAdminHeaders(),
    });
  }
}
