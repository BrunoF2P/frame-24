import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  BackchannelLogoutDto,
  CheckOidcSessionDto,
  RegisterOidcSessionDto,
} from '../dto/internal-oidc-session.dto';
import { OidcSessionService } from '../services/oidc-session.service';

@Controller({ path: 'internal/oidc/sessions', version: '1' })
export class InternalOidcSessionController {
  constructor(private readonly oidcSessionService: OidcSessionService) {}

  private assertSecret(secret?: string) {
    const expected =
      process.env.OIDC_INTERNAL_SECRET ??
      process.env.AUTH_INTERNAL_SECRET ??
      'frame24-oidc-internal-dev-secret';

    if (!secret || secret !== expected) {
      throw new UnauthorizedException('Invalid internal authentication.');
    }
  }

  @Post('register')
  async register(
    @Headers('x-frame24-internal-secret') secret: string | undefined,
    @Body() body: RegisterOidcSessionDto,
  ) {
    this.assertSecret(secret);
    return this.oidcSessionService.registerSession(body);
  }

  @Get('status')
  async status(
    @Headers('x-frame24-internal-secret') secret: string | undefined,
    @Query() query: CheckOidcSessionDto,
  ) {
    this.assertSecret(secret);
    return this.oidcSessionService.isSessionActive(query);
  }

  @Post('backchannel-logout')
  async backchannelLogout(
    @Headers('x-frame24-internal-secret') secret: string | undefined,
    @Body() body: BackchannelLogoutDto,
  ) {
    this.assertSecret(secret);
    return this.oidcSessionService.revokeFromBackchannel(body);
  }
}
