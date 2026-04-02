import { NextResponse } from "next/server";
import { revokeOidcSessionFromBackchannel } from "@/services/internal-oidc-session";

async function readLogoutToken(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    return formData.get("logout_token")?.toString();
  }

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { logout_token?: string };
    return body.logout_token;
  }

  return undefined;
}

export async function POST(request: Request) {
  try {
    const logoutToken = await readLogoutToken(request);

    if (!logoutToken) {
      return NextResponse.json(
        { success: false, message: "logout_token is required" },
        { status: 400 },
      );
    }

    await revokeOidcSessionFromBackchannel({
      logoutToken,
      expectedAudience: process.env.AUTH_OIDC_ID ?? "frame24-admin",
      issuer: process.env.AUTH_OIDC_ISSUER,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Backchannel logout failed";

    console.error("[backchannel-logout][admin]", message);

    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}
