import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSecurityHeaders } from "../security-headers";

const webRoot = process.cwd();

const files = [
  "src/app/[tenant_slug]/page.tsx",
  "src/app/[tenant_slug]/cidade/[citySlug]/page.tsx",
  "src/app/[tenant_slug]/cidade/[citySlug]/filmes/page.tsx",
  "src/app/[tenant_slug]/cidade/[citySlug]/filme/[movieSlug]/page.tsx",
  "src/app/[tenant_slug]/cidade/[citySlug]/sessao/[showtimeId]/page.tsx",
  "src/app/[tenant_slug]/checkout/[checkoutId]/page.tsx",
  "src/app/[tenant_slug]/pedido/[orderId]/page.tsx",
  "src/components/profile/ticket-action-panel.tsx",
  "src/components/profile/profile-shell.tsx",
  "src/lib/storefront/api.ts",
];

test("tenant production flow does not import mocked storefront data or external QR", () => {
  for (const file of files) {
    const source = readFileSync(join(webRoot, file), "utf8");
    expect(source, file).not.toContain("@/lib/storefront/data");
    expect(source, file).not.toContain("storefront/data");
    expect(source, file).not.toContain("api.qrserver.com");
    expect(source, file).not.toContain("FRAME24-QR-DEMO");
  }
});

test("web security headers allow local API connections outside production", () => {
  const headers = buildSecurityHeaders({
    nodeEnv: "development",
    apiUrl: "http://localhost:4000",
    socketUrl: "http://localhost:4000",
    authUrl: "http://localhost:4000",
  });
  const csp = headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";

  expect(csp).toContain("connect-src");
  expect(csp).toContain("http://localhost:4000");
  expect(csp).toContain("ws://localhost:4000");
  expect(headers.some((header) => header.key === "Strict-Transport-Security")).toBe(false);
});

test("search effects handle request failures instead of floating rejections", () => {
  const filesWithSearchEffects = [
    "src/components/layout/global-search-combobox.tsx",
    "src/components/cinema/search-suggest.tsx",
  ];

  for (const file of filesWithSearchEffects) {
    const source = readFileSync(join(webRoot, file), "utf8");
    expect(source, file).not.toContain("void run();");
    expect(source, file).toContain(".catch(");
  }
});

test("E2E customer credentials are read from environment only", () => {
  const credentialFiles = [
    "e2e/helpers/e2e-env.ts",
    "../api/src/scripts/seed-web-e2e.ts",
  ];

  for (const file of credentialFiles) {
    const source = readFileSync(join(webRoot, file), "utf8");

    expect(source, file).not.toMatch(/customerPassword:\s*(?:\r?\n\s*)?['"`]/);
    expect(source, file).not.toMatch(/E2E_CUSTOMER_PASSWORD\s*\|\|\s*['"`]/);
    expect(source, file).not.toMatch(
      /customerPassword:\s*FIXTURE\.customerPassword/,
    );
  }
});
