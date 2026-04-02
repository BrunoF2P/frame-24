const AUTHENTIK_URL =
  process.env.AUTHENTIK_URL?.replace(/\/$/, "") ?? "http://localhost:9080";
const AUTHENTIK_TOKEN =
  process.env.AUTHENTIK_TOKEN ?? "frame24-authentik-bootstrap-token";

const WEB_URL = process.env.FRAME24_WEB_URL ?? "http://localhost:3000";
const ADMIN_URL = process.env.FRAME24_ADMIN_URL ?? "http://localhost:3004";
const LANDING_URL = process.env.FRAME24_LANDING_URL ?? "http://localhost:3003";

const SHARED_CLIENT_ID =
  process.env.FRAME24_OIDC_CLIENT_ID ?? "frame24-app";
const SHARED_CLIENT_SECRET =
  process.env.FRAME24_OIDC_CLIENT_SECRET ?? "frame24-app-dev-secret";

const AUTHORIZATION_FLOW_SLUG =
  process.env.FRAME24_AUTHORIZATION_FLOW_SLUG ??
  "default-provider-authorization-explicit-consent";
const INVALIDATION_FLOW_SLUG =
  process.env.FRAME24_INVALIDATION_FLOW_SLUG ??
  "default-provider-invalidation-flow";
const SIGNING_KEY_NAME =
  process.env.FRAME24_SIGNING_KEY_NAME ?? "Frame24 OIDC Signing Key";
const USER_LOGOUT_STAGE_NAME =
  process.env.FRAME24_USER_LOGOUT_STAGE_NAME ?? "default-invalidation-logout";
const AUTHENTICATION_FLOW_SLUG =
  process.env.FRAME24_AUTHENTICATION_FLOW_SLUG ?? "default-authentication-flow";
const AUTHENTICATION_FLOW_NAME =
  process.env.FRAME24_AUTHENTICATION_FLOW_NAME ?? "Entrar no Frame24";
const AUTHENTICATION_FLOW_TITLE =
  process.env.FRAME24_AUTHENTICATION_FLOW_TITLE ?? "Entrar no Frame24";
const BRAND_TITLE = process.env.FRAME24_BRAND_TITLE ?? "Frame24";
const BRAND_DEFAULT_DOMAIN =
  process.env.FRAME24_BRAND_DOMAIN ?? "authentik-default";
const BRAND_CUSTOM_CSS = `
:root {
  --ak-accent: #dc2626;
  --ak-accent-hover: #ef4444;
  --ak-primary-background: #09090b;
  --ak-secondary-background: rgba(24, 24, 27, 0.92);
  --ak-dark-foreground: #fafafa;
  --ak-light-foreground: #d4d4d8;
  --ak-border-color: rgba(255, 255, 255, 0.12);
}

body {
  background:
    radial-gradient(circle at top left, rgba(220, 38, 38, 0.22), transparent 32%),
    radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.16), transparent 26%),
    linear-gradient(180deg, #050505 0%, #09090b 52%, #111827 100%);
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(circle at center, black, transparent 85%);
}

.pf-c-brand img,
.pf-v5-c-brand img,
a[aria-label="authentik"] img,
img[alt="authentik"] {
  opacity: 0 !important;
}

ak-flow-executor,
.ak-flow-card,
main-flow,
[part="card"] {
  backdrop-filter: blur(18px);
}

.pf-c-login,
.pf-c-card,
.pf-v5-c-card,
.ak-flow-card {
  background: rgba(24, 24, 27, 0.78) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45) !important;
  border-radius: 24px !important;
}

.pf-c-button.pf-m-primary,
.pf-v5-c-button.pf-m-primary,
button[type="submit"] {
  background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%) !important;
  border: none !important;
  color: #fff !important;
  box-shadow: 0 18px 38px rgba(220, 38, 38, 0.28) !important;
}

.pf-c-button.pf-m-primary:hover,
.pf-v5-c-button.pf-m-primary:hover,
button[type="submit"]:hover {
  filter: brightness(1.05);
}

.pf-c-form-control,
.pf-v5-c-form-control,
input,
select,
textarea {
  background: rgba(9, 9, 11, 0.82) !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
  color: #fafafa !important;
}

.pf-c-form-control:focus,
.pf-v5-c-form-control:focus,
input:focus,
select:focus,
textarea:focus {
  border-color: rgba(239, 68, 68, 0.75) !important;
  box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.75) !important;
}

.pf-c-title,
.pf-v5-c-title,
h1,
h2,
h3 {
  letter-spacing: -0.02em;
}
`.trim();

const providerConfig = {
  name: "Frame24 Shared OIDC",
  client_id: SHARED_CLIENT_ID,
  client_secret: SHARED_CLIENT_SECRET,
  applicationSlug: "frame24-app",
  applicationName: "Frame24",
  launchUrl: WEB_URL,
  redirect_uris: [
    { matching_mode: "strict", url: `${WEB_URL}/api/auth/callback/authentik` },
    {
      matching_mode: "strict",
      url: `${ADMIN_URL}/api/auth/callback/authentik`,
    },
    {
      matching_mode: "strict",
      url: `${LANDING_URL}/api/auth/callback/authentik`,
    },
  ],
};

function log(message) {
  console.log(`[authentik-bootstrap] ${message}`);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAuthentik() {
  const liveUrl = `${AUTHENTIK_URL}/-/health/live/`;

  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetch(liveUrl);
      if (response.ok) {
        log(`Authentik disponível após ${attempt} tentativa(s).`);
        return;
      }
    } catch {
      // Retry until service is ready.
    }

    await sleep(2000);
  }

  throw new Error(
    `Authentik não respondeu em tempo hábil em ${AUTHENTIK_URL}.`,
  );
}

async function request(path, options = {}) {
  const response = await fetch(`${AUTHENTIK_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${AUTHENTIK_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Falha em ${options.method ?? "GET"} ${path}: ${response.status} ${body}`,
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function findFlowPk(slug) {
  try {
    const flow = await request(`/api/v3/flows/instances/${slug}/`);
    if (flow?.pk) {
      return flow.pk;
    }
  } catch {
    // Try next fallback.
  }

  return null;
}

async function resolveFlowPk(...slugs) {
  for (const slug of slugs) {
    const pk = await findFlowPk(slug);
    if (pk) {
      return pk;
    }
  }

  throw new Error(`Nenhum flow encontrado entre: ${slugs.join(", ")}`);
}

async function findSigningKeyByName(name) {
  const result = await request(
    `/api/v3/crypto/certificatekeypairs/?name=${encodeURIComponent(name)}`,
  );

  return result?.results?.find((item) => item?.name === name) ?? null;
}

async function ensureSigningKey() {
  const existing =
    (await findSigningKeyByName(SIGNING_KEY_NAME)) ??
    (await findSigningKeyByName("authentik Self-signed Certificate"));

  if (existing?.pk) {
    log(`Usando keypair ${existing.name}.`);
    return existing.pk;
  }

  log(`Criando keypair RSA ${SIGNING_KEY_NAME}.`);
  const created = await request(`/api/v3/crypto/certificatekeypairs/generate/`, {
    method: "POST",
    body: JSON.stringify({
      common_name: SIGNING_KEY_NAME,
      validity_days: 3650,
      alg: "rsa",
    }),
  });

  if (!created?.pk) {
    throw new Error("Não foi possível criar a signing key do Authentik.");
  }

  return created.pk;
}

async function findOAuthProviderByClientId(clientId) {
  const result = await request(
    `/api/v3/providers/oauth2/?client_id=${encodeURIComponent(clientId)}`,
  );

  return result?.results?.[0] ?? null;
}

async function upsertOAuthProvider(
  config,
  authorizationFlowPk,
  invalidationFlowPk,
  signingKeyPk,
) {
  const existing = await findOAuthProviderByClientId(config.client_id);
  const payload = {
    name: config.name,
    client_type: "confidential",
    client_id: config.client_id,
    client_secret: config.client_secret,
    authorization_flow: authorizationFlowPk,
    invalidation_flow: invalidationFlowPk,
    redirect_uris: config.redirect_uris,
    include_claims_in_id_token: true,
    issuer_mode: "per_provider",
    sub_mode: "user_id",
    signing_key: signingKeyPk,
  };

  if (existing) {
    log(`Atualizando provider OAuth2 ${config.client_id}.`);
    return request(`/api/v3/providers/oauth2/${existing.pk}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  log(`Criando provider OAuth2 ${config.client_id}.`);
  return request(`/api/v3/providers/oauth2/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function findApplication(slug) {
  try {
    return await request(`/api/v3/core/applications/${slug}/`);
  } catch (error) {
    if (String(error).includes(" 404 ")) {
      return null;
    }
    throw error;
  }
}

async function upsertApplication(config, providerPk) {
  const existing = await findApplication(config.applicationSlug);
  const payload = {
    name: config.applicationName,
    slug: config.applicationSlug,
    provider: providerPk,
    meta_launch_url: config.launchUrl,
    open_in_new_tab: false,
  };

  if (existing) {
    log(`Atualizando application ${config.applicationSlug}.`);
    return request(`/api/v3/core/applications/${config.applicationSlug}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  log(`Criando application ${config.applicationSlug}.`);
  return request(`/api/v3/core/applications/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function findBrandByDomain(domain) {
  const result = await request(
    `/api/v3/core/brands/?domain=${encodeURIComponent(domain)}`,
  );

  return result?.results?.find((item) => item?.domain === domain) ?? null;
}

async function upsertDefaultBrand() {
  const existing = await findBrandByDomain(BRAND_DEFAULT_DOMAIN);
  const payload = {
    domain: BRAND_DEFAULT_DOMAIN,
    default: true,
    branding_title: BRAND_TITLE,
    branding_custom_css: BRAND_CUSTOM_CSS,
    branding_logo: "/static/dist/assets/icons/icon_left_brand.svg",
    branding_favicon: "/static/dist/assets/icons/icon.png",
    branding_default_flow_background:
      existing?.branding_default_flow_background ??
      "/static/dist/assets/images/flow_background.jpg",
    flow_authentication: existing?.flow_authentication ?? null,
    flow_invalidation: existing?.flow_invalidation ?? null,
    flow_recovery: existing?.flow_recovery ?? null,
    flow_unenrollment: existing?.flow_unenrollment ?? null,
    flow_user_settings: existing?.flow_user_settings ?? null,
    flow_device_code: existing?.flow_device_code ?? null,
    default_application: existing?.default_application ?? null,
    web_certificate: existing?.web_certificate ?? null,
    client_certificates: existing?.client_certificates ?? [],
    attributes: {
      ...(existing?.attributes ?? {}),
      product_name: BRAND_TITLE,
    },
  };

  if (existing) {
    log(`Atualizando brand padrão ${BRAND_DEFAULT_DOMAIN}.`);
    return request(`/api/v3/core/brands/${existing.brand_uuid}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  log(`Criando brand padrão ${BRAND_DEFAULT_DOMAIN}.`);
  return request(`/api/v3/core/brands/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function findUserLogoutStageByName(name) {
  const result = await request(
    `/api/v3/stages/user_logout/?name=${encodeURIComponent(name)}`,
  );

  return result?.results?.find((item) => item?.name === name) ?? null;
}

async function ensureUserLogoutStagePk() {
  const existing = await findUserLogoutStageByName(USER_LOGOUT_STAGE_NAME);

  if (existing?.pk) {
    return existing.pk;
  }

  const fallback = await findUserLogoutStageByName("default-invalidation-logout");
  if (fallback?.pk) {
    return fallback.pk;
  }

  throw new Error(
    `Nenhum User Logout stage encontrado para ${USER_LOGOUT_STAGE_NAME}.`,
  );
}

async function findFlowStageBinding(target, stage) {
  const result = await request(
    `/api/v3/flows/bindings/?target=${encodeURIComponent(target)}&stage=${encodeURIComponent(stage)}`,
  );

  return result?.results?.[0] ?? null;
}

async function ensureFlowStageBinding({
  target,
  stage,
  order = 0,
}) {
  const existing = await findFlowStageBinding(target, stage);
  if (existing?.pk) {
    return existing.pk;
  }

  log(`Vinculando stage ${stage} ao flow ${target}.`);
  const created = await request(`/api/v3/flows/bindings/`, {
    method: "POST",
    body: JSON.stringify({
      target,
      stage,
      order,
      evaluate_on_plan: true,
      re_evaluate_policies: false,
      policy_engine_mode: "any",
      invalid_response_action: "retry",
    }),
  });

  return created?.pk ?? null;
}

async function findFlowBySlug(slug) {
  return request(`/api/v3/flows/instances/${slug}/`);
}

async function ensureAuthenticationFlowBranding() {
  const flow = await findFlowBySlug(AUTHENTICATION_FLOW_SLUG);

  if (
    flow?.name === AUTHENTICATION_FLOW_NAME &&
    flow?.title === AUTHENTICATION_FLOW_TITLE
  ) {
    return flow.pk;
  }

  log(`Atualizando flow ${AUTHENTICATION_FLOW_SLUG}.`);
  const updated = await request(
    `/api/v3/flows/instances/${AUTHENTICATION_FLOW_SLUG}/`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: AUTHENTICATION_FLOW_NAME,
        slug: flow.slug,
        title: AUTHENTICATION_FLOW_TITLE,
        designation: flow.designation,
        background: flow.background,
        layout: flow.layout,
        denied_action: flow.denied_action,
        authentication: flow.authentication,
        compatibility_mode: flow.compatibility_mode,
        policy_engine_mode: flow.policy_engine_mode,
      }),
    },
  );

  return updated?.pk ?? flow.pk;
}

async function main() {
  await waitForAuthentik();

  const [authorizationFlowPk, invalidationFlowPk, signingKeyPk, userLogoutStagePk] =
    await Promise.all([
      resolveFlowPk(
        AUTHORIZATION_FLOW_SLUG,
        "default-provider-authorization-implicit-consent",
      ),
      resolveFlowPk(
        INVALIDATION_FLOW_SLUG,
        "default-invalidation-flow",
      ),
      ensureSigningKey(),
      ensureUserLogoutStagePk(),
  ]);

  await ensureFlowStageBinding({
    target: invalidationFlowPk,
    stage: userLogoutStagePk,
    order: 0,
  });

  await ensureAuthenticationFlowBranding();

  const provider = await upsertOAuthProvider(
    providerConfig,
    authorizationFlowPk,
    invalidationFlowPk,
    signingKeyPk,
  );

  await Promise.all([
    upsertApplication(providerConfig, provider.pk),
    upsertDefaultBrand(),
  ]);

  log("Bootstrap do Authentik concluído.");
  log(`Issuer compartilhado: ${AUTHENTIK_URL}/application/o/${SHARED_CLIENT_ID}/`);
  log(`Client ID: ${SHARED_CLIENT_ID}`);
  log(`Branding ativo: ${BRAND_TITLE}`);
}

main().catch((error) => {
  console.error(`[authentik-bootstrap] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
