const OIDC_ISSUER =
  process.env.NEXT_PUBLIC_AUTH_OIDC_ISSUER ??
  process.env.AUTH_OIDC_ISSUER ??
  "http://localhost:9080/application/o/frame24-app/";

function normalizeIssuer(issuer: string) {
  return issuer.endsWith("/") ? issuer : `${issuer}/`;
}

export function buildOidcLogoutUrl(params?: {
  idToken?: string;
  postLogoutRedirectUrl?: string;
}) {
  const issuer = normalizeIssuer(OIDC_ISSUER);
  const endSessionEndpoint = new URL("end-session/", issuer);

  if (params?.idToken) {
    endSessionEndpoint.searchParams.set("id_token_hint", params.idToken);
  }

  if (params?.postLogoutRedirectUrl) {
    endSessionEndpoint.searchParams.set(
      "post_logout_redirect_uri",
      params.postLogoutRedirectUrl,
    );
  }

  return endSessionEndpoint.toString();
}
