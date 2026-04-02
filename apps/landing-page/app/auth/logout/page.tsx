"use client";

import { useEffect } from "react";
import { getSession, signOut } from "next-auth/react";
import { buildOidcLogoutUrl } from "@/lib/oidc-logout";

export default function LandingLogoutPage() {
  useEffect(() => {
    const run = async () => {
      const session = await getSession();
      const postLogoutRedirectUrl =
        typeof window === "undefined" ? "/" : `${window.location.origin}/`;
      const logoutParams = {
        idToken: session?.idToken,
        postLogoutRedirectUrl,
      };

      await signOut({ redirect: false });
      window.location.assign(buildOidcLogoutUrl(logoutParams));
    };

    void run();
  }, []);

  return null;
}
