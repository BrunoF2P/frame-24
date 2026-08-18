import { expect, test } from "@playwright/test";
import { e2eEnv, requireEnv } from "./helpers/e2e-env";

test.describe("tenant public navigation", () => {
  test.beforeEach(() => {
    requireEnv("tenantSlug", "citySlug");
  });

  test("opens tenant, preserves tenant in city and movie links", async ({ page }) => {
    await page.goto(`/${e2eEnv.tenantSlug}`);
    await expect(page).toHaveURL(new RegExp(`/${e2eEnv.tenantSlug}/cidade/`));

    await page.goto(`/${e2eEnv.tenantSlug}/cidade/${e2eEnv.citySlug}`);
    await expect(page.getByRole("main").first()).toBeVisible();

    const movieLink = page
      .locator(`a[href^="/${e2eEnv.tenantSlug}/cidade/${e2eEnv.citySlug}/filme/"]`)
      .first();
    await expect(movieLink).toBeVisible();
    await movieLink.click();
    await expect(page).toHaveURL(new RegExp(`/${e2eEnv.tenantSlug}/cidade/${e2eEnv.citySlug}/filme/`));

    const sessionLink = page
      .locator(`a[href^="/${e2eEnv.tenantSlug}/cidade/${e2eEnv.citySlug}/sessao/"]`)
      .first();
    await expect(sessionLink).toBeVisible();
  });
});
