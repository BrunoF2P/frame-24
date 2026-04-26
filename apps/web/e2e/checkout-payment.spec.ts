import { expect, test, type Page } from "@playwright/test";
import { loginCustomer } from "./helpers/auth";
import { e2eEnv, requireEnv } from "./helpers/e2e-env";

const checkoutForProject = (
  projectName: string,
  kind: "paid" | "failed",
) => {
  const mobile = projectName.toLowerCase().includes("mobile");

  if (kind === "paid") {
    return mobile ? e2eEnv.paidCheckoutMobileId : e2eEnv.paidCheckoutDesktopId;
  }

  return mobile ? e2eEnv.failedCheckoutMobileId : e2eEnv.failedCheckoutDesktopId;
};

const checkoutStatusUrl = (checkoutId: string) =>
  `${e2eEnv.apiBaseUrl}/v1/customer/checkout-sessions/${checkoutId}/payment-status`;

const createPaymentAttempt = async (
  page: Page,
  checkoutId: string,
  simulateStatus: "paid" | "failed",
  projectName: string,
) => {
  const response = await page.request.post(
    `${e2eEnv.apiBaseUrl}/v1/customer/checkout-sessions/${checkoutId}/payment-attempts`,
    {
      data: {
        method: "Cartão de Crédito",
        provider: "internal",
        simulate_status: simulateStatus,
      },
      headers: {
        "x-tenant-slug": e2eEnv.tenantSlug,
        "idempotency-key": `web-e2e-${simulateStatus}-${projectName}`,
      },
    },
  );

  if (response.ok()) {
    return;
  }

  const errorText = await response.text();
  const currentStatus = await getPaymentStatus(page, checkoutId);
  const alreadyMutated =
    simulateStatus === "paid"
      ? currentStatus.checkout_status === "paid"
      : currentStatus.checkout_status === "payment_failed";

  if (response.status() === 400 && alreadyMutated) {
    return;
  }

  if (!response.ok()) {
    throw new Error(
      `Payment attempt failed with ${response.status()}: ${errorText}`,
    );
  }
};

const getPaymentStatus = async (page: Page, checkoutId: string) => {
  const response = await page.request.get(checkoutStatusUrl(checkoutId), {
    headers: { "x-tenant-slug": e2eEnv.tenantSlug },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as {
    checkout_status?: string;
    sale_id?: string | null;
    public_reference?: string | null;
    payment?: {
      status?: string;
      sale_id?: string | null;
      public_reference?: string | null;
    } | null;
  };
};

test.describe("tenant checkout payment", () => {
  test.beforeEach(() => {
    requireEnv(
      "tenantSlug",
      "apiBaseUrl",
      "paidCheckoutDesktopId",
      "paidCheckoutMobileId",
      "failedCheckoutDesktopId",
      "failedCheckoutMobileId",
      "customerEmail",
      "customerPassword",
    );
  });

  test("approved card payment creates order, ticket and refund request in profile", async ({
    page,
  }, testInfo) => {
    await loginCustomer(page);

    const checkoutId = checkoutForProject(testInfo.project.name, "paid");
    await createPaymentAttempt(page, checkoutId, "paid", testInfo.project.name);
    const status = await getPaymentStatus(page, checkoutId);
    const orderReference =
      status.public_reference ??
      status.payment?.public_reference ??
      status.sale_id ??
      status.payment?.sale_id;

    expect(status.checkout_status).toBe("paid");
    expect(orderReference).toBeTruthy();

    await page.goto(`/${e2eEnv.tenantSlug}/pagamento/${checkoutId}`);
    await expect(page).toHaveURL(new RegExp(`/${e2eEnv.tenantSlug}/pedido/`));
    await expect(
      page.getByRole("heading", { name: /compra realizada com sucesso/i }),
    ).toBeVisible();

    await page.goto(`/${e2eEnv.tenantSlug}/perfil/pedidos/${status.sale_id}`);
    await expect(page.getByRole("heading", { name: /pedido/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /solicitar reembolso por item/i }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: /solicitar reembolso por item/i })
      .click();
    await page.getByRole("checkbox").first().check();
    await page
      .locator("#refund-reason")
      .fill(`Cobertura E2E ${testInfo.project.name}`);
    await page
      .getByRole("button", { name: /enviar solicitação/i })
      .click();
    await expect(page.getByText(/solicitação criada com sucesso/i)).toBeVisible();

    await page.goto(`/${e2eEnv.tenantSlug}/perfil/ingressos`);
    await expect(page.getByRole("main")).toContainText(/Aventuras no Atlântico/i);
  });

  test("failed card payment keeps checkout failed and does not confirm an order", async ({
    page,
  }, testInfo) => {
    await loginCustomer(page);

    const checkoutId = checkoutForProject(testInfo.project.name, "failed");
    await createPaymentAttempt(page, checkoutId, "failed", testInfo.project.name);
    const status = await getPaymentStatus(page, checkoutId);

    expect(status.checkout_status).toBe("payment_failed");
    expect(status.sale_id).toBeFalsy();

    await page.goto(`/${e2eEnv.tenantSlug}/pagamento/${checkoutId}`);
    await expect(
      page.getByRole("heading", { name: /pagamento não concluído/i }),
    ).toBeVisible();
    await expect(page.getByText(/status atual/i)).toBeVisible();
    await expect(page).not.toHaveURL(new RegExp(`/${e2eEnv.tenantSlug}/pedido/`));
  });
});
