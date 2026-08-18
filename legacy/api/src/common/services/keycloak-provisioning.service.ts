import { Injectable } from '@nestjs/common';
import { NoopProvisioningService } from './noop-provisioning.service';

@Injectable()
export class KeycloakProvisioningService extends NoopProvisioningService {}
