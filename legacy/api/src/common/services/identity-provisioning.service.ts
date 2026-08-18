export interface ProvisionIdentityInput {
  email: string;
  fullName: string;
  password: string;
  target?: 'employee' | 'customer';
  realmRoles?: string[];
  temporaryPassword?: boolean;
  requiredActions?: string[];
  groups?: string[];
}

export abstract class IdentityProvisioningService {
  abstract createUser(input: ProvisionIdentityInput): Promise<string>;
  abstract deleteUser(
    userId: string,
    target?: ProvisionIdentityInput['target'],
  ): Promise<void>;
}
