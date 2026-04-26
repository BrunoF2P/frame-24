import { expect, type Page } from "@playwright/test";
import { e2eEnv } from "./e2e-env";

export const loginCustomer = async (page: Page) => {
  await page.goto(`/${e2eEnv.tenantSlug}/auth/login`);

  const emailInput = page.locator("#tenant-login-email").first();
  const passwordInput = page.locator("#tenant-login-password").first();

  await expect(emailInput).toBeVisible();
  await emailInput.fill(e2eEnv.customerEmail!);
  await expect(passwordInput).toBeVisible();
  await passwordInput.fill(e2eEnv.customerPassword!);

  await page
    .locator("form")
    .getByRole("button", { name: /entrar|login/i })
    .click();

  await expect(page).toHaveURL(new RegExp(`/${e2eEnv.tenantSlug}/`));
  await expect(page).not.toHaveURL(new RegExp(`/${e2eEnv.tenantSlug}/auth/login`));
};
