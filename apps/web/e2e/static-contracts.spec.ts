import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
