import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  IdentityProvisioningService,
  ProvisionIdentityInput,
} from './identity-provisioning.service';

@Injectable()
export class NoopProvisioningService extends IdentityProvisioningService {
  createUser(input: ProvisionIdentityInput): Promise<string> {
    void input;

    return Promise.reject(
      new BadGatewayException(
        'Provisioning externo de identidade está desabilitado no modo local.',
      ),
    );
  }

  deleteUser(
    userId: string,
    target?: ProvisionIdentityInput['target'],
  ): Promise<void> {
    void userId;
    void target;

    // no-op intencional para cenários sem provider configurado
    return Promise.resolve();
  }
}
