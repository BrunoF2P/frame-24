import { expect, test } from "@playwright/test";
import { loginCustomer } from "./helpers/auth";
import { e2eEnv, requireEnv } from "./helpers/e2e-env";

test.describe("tenant checkout restore", () => {
  test.beforeEach(() => {
    requireEnv("tenantSlug", "checkoutId", "customerEmail", "customerPassword");
  });

  test("refresh keeps checkout status and payment context", async ({ page }) => {
    await loginCustomer(page);

    await page.goto(`/${e2eEnv.tenantSlug}/pagamento/${e2eEnv.checkoutId}`);
    await expect(page.getByRole("heading", { name: /checkout|pagamento/i })).toBeVisible();
    await page.reload();
    await expect(page.getByText(/status atual/i)).toBeVisible();
    await expect(page.getByText(/pix copia e cola/i)).toBeVisible();
  });
});
