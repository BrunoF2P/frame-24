import { expect, test } from "@playwright/test";
import { loginCustomer } from "./helpers/auth";
import { e2eEnv, requireEnv } from "./helpers/e2e-env";

test.describe("tenant profile", () => {
  test.beforeEach(() => {
    requireEnv("tenantSlug", "customerEmail", "customerPassword");
  });

  test("login keeps customer inside tenant profile routes", async ({ page }) => {
    await loginCustomer(page);
    await page.goto(`/${e2eEnv.tenantSlug}/perfil/pedidos`);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator('a[href^="/perfil"]')).toHaveCount(0);
  });

  test("security page shows session management actions", async ({ page }) => {
    await loginCustomer(page);
    await page.goto(`/${e2eEnv.tenantSlug}/perfil/seguranca`);

    await expect(
      page.getByRole("heading", { name: /segurança da conta/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /sessões e dispositivos ativos/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /encerrar todas as outras/i }),
    ).toBeVisible();
  });

  test("privacy page creates export and deletion requests", async ({ page }) => {
    await loginCustomer(page);
    await page.goto(`/${e2eEnv.tenantSlug}/perfil/privacidade`);

    await expect(page.getByRole("heading", { name: /privacidade/i })).toBeVisible();
    await page.getByRole("button", { name: /solicitar exportação/i }).click();
    await expect(
      page.getByText(/solicitação de exportação criada/i),
    ).toBeVisible();

    await page.locator("#delete-reason").fill("Cobertura E2E de privacidade");
    await page.locator("#delete-confirm").fill("EXCLUIR MINHA CONTA");
    await page.getByRole("button", { name: /solicitar exclusão/i }).click();
    await expect(
      page.getByText(/solicitação de exclusão criada/i),
    ).toBeVisible();
  });
});
