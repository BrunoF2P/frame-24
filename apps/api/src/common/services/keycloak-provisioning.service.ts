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

  async createUser(input: CreateKeycloakUserInput): Promise<string> {
    const baseUrl = this.resolveBaseUrl();
    const config = this.getProvisioningConfig();

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
