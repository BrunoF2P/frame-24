import {
  getTrustedFrontendOrigins,
  isAllowedFrontendOrigin,
  resolveAllowedFrontendOrigins,
} from './frontend-origins.config';

describe('frontend origins config', () => {
  const developmentEnv = {
    NODE_ENV: 'development',
    FRONTEND_URL: 'http://frontend.example.com,http://localhost:3000',
    TENANT_BASE_DOMAIN: 'frame24.test',
  };

  it('keeps the canonical web dev port on 3000', () => {
    const origins = resolveAllowedFrontendOrigins(developmentEnv);

    expect(origins).toContain('http://localhost:3000');
    expect(origins).toContain('http://127.0.0.1:3000');
    expect(origins).not.toContain('http://localhost:3001');
  });

  it('uses configured origins and tenant wildcards for Better Auth', () => {
    expect(getTrustedFrontendOrigins(developmentEnv)).toEqual(
      expect.arrayContaining([
        'http://frontend.example.com',
        'http://localhost:3000',
        'https://*.frame24.test',
        'https://frame24.test',
        'http://*.localhost:3000',
        'http://*.lvh.me:3000',
      ]),
    );
  });

  it('allows configured, canonical dev, and local tenant origins only', () => {
    expect(
      isAllowedFrontendOrigin('http://frontend.example.com', developmentEnv),
    ).toBe(true);
    expect(
      isAllowedFrontendOrigin('http://localhost:3000', developmentEnv),
    ).toBe(true);
    expect(
      isAllowedFrontendOrigin('http://localhost:3001', developmentEnv),
    ).toBe(false);
    expect(
      isAllowedFrontendOrigin(
        'http://lawtrel-admin.localhost:3000',
        developmentEnv,
      ),
    ).toBe(true);
    expect(
      isAllowedFrontendOrigin(
        'http://lawtrel-admin.localhost:3001',
        developmentEnv,
      ),
    ).toBe(false);
    expect(
      isAllowedFrontendOrigin('http://evil.example.com', developmentEnv),
    ).toBe(false);
  });
});
