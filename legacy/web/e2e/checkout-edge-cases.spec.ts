import { expect, test, type Page } from "@playwright/test";
import { loginCustomer } from "./helpers/auth";
import { e2eEnv, requireEnv } from "./helpers/e2e-env";

const checkoutForProject = (
  projectName: string,
  kind: "pix" | "stock",
) => {
  const mobile = projectName.toLowerCase().includes("mobile");

  if (kind === "pix") {
    return mobile ? e2eEnv.pixCheckoutMobileId : e2eEnv.pixCheckoutDesktopId;
  }

  return mobile ? e2eEnv.stockCheckoutMobileId : e2eEnv.stockCheckoutDesktopId;
};

const checkoutUrl = (checkoutId: string) =>
  `${e2eEnv.apiBaseUrl}/v1/customer/checkout-sessions/${checkoutId}`;

const paymentUrl = (checkoutId: string) =>
  `${checkoutUrl(checkoutId)}/payment-attempts`;

const statusUrl = (checkoutId: string) =>
  `${checkoutUrl(checkoutId)}/payment-status`;

const tenantHeaders = () => ({ "x-tenant-slug": e2eEnv.tenantSlug });

const getCheckout = async (page: Page, checkoutId: string) => {
  const response = await page.request.get(checkoutUrl(checkoutId), {
    headers: tenantHeaders(),
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as {
    showtime_id: string;
    reservation_uuid: string;
    tickets: Array<{ seat_id: string; ticket_type?: string }>;
    concession_items: Array<{ item_type: "PRODUCT" | "COMBO"; item_id: string }>;
  };
};

const getStatus = async (page: Page, checkoutId: string) => {
  const response = await page.request.get(statusUrl(checkoutId), {
    headers: tenantHeaders(),
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as {
    checkout_status?: string;
    sale_id?: string | null;
    public_reference?: string | null;
    payment?: {
      status?: string;
      provider_reference?: string;
      sale_id?: string | null;
      public_reference?: string | null;
      payment_data?: {
        pix_qr_code?: string;
        pix_copy_paste?: string;
      } | null;
    } | null;
  };
};

test.describe("tenant checkout edge cases", () => {
  test.beforeEach(() => {
    requireEnv(
      "tenantSlug",
      "apiBaseUrl",
      "pixCheckoutDesktopId",
      "pixCheckoutMobileId",
      "stockCheckoutDesktopId",
      "stockCheckoutMobileId",
      "customerEmail",
      "customerPassword",
    );
  });

  test.skip("pending Pix survives refresh and webhook approval confirms the order", async ({
    page,
  }, testInfo) => {
    await loginCustomer(page);
    const checkoutId = checkoutForProject(testInfo.project.name, "pix");

    const attemptResponse = await page.request.post(paymentUrl(checkoutId), {
      data: {
        method: "Pix",
        provider: "internal",
        simulate_status: "pending",
      },
      headers: {
        ...tenantHeaders(),
        "idempotency-key": `web-e2e-pix-${testInfo.project.name}`,
      },
    });
    expect(attemptResponse.ok(), await attemptResponse.text()).toBeTruthy();

    let status = await getStatus(page, checkoutId);
    expect(status.checkout_status).toBe("payment_pending");
    expect(status.payment?.payment_data?.pix_copy_paste).toContain("FRAME24");
    expect(status.payment?.provider_reference).toBeTruthy();

    await page.goto(`/${e2eEnv.tenantSlug}/checkout/${checkoutId}`);
    await expect(
      page.getByRole("heading", { name: /aguardando pagamento/i }),
    ).toBeVisible();
    await expect(page.getByText(/pix copia e cola/i)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/pix copia e cola/i)).toBeVisible();

    const webhookEventId = `web-e2e-pix-paid-${testInfo.project.name}-${status.payment!.provider_reference}`;
    const webhookResponse = await page.request.post(
      `${e2eEnv.apiBaseUrl}/v1/payments/webhooks/internal`,
      {
        data: {
          external_event_id: webhookEventId,
          provider_reference: status.payment!.provider_reference,
          status: "paid",
        },
      },
    );
    expect(webhookResponse.ok(), await webhookResponse.text()).toBeTruthy();

    const duplicateWebhookResponse = await page.request.post(
      `${e2eEnv.apiBaseUrl}/v1/payments/webhooks/internal`,
      {
        data: {
          external_event_id: webhookEventId,
          provider_reference: status.payment!.provider_reference,
          status: "paid",
        },
      },
    );
    expect(duplicateWebhookResponse.ok(), await duplicateWebhookResponse.text()).toBeTruthy();
    await expect.poll(async () => {
      status = await getStatus(page, checkoutId);
      return status.checkout_status;
    }).toBe("paid");

    await page.goto(`/${e2eEnv.tenantSlug}/checkout/${checkoutId}`);
    await expect(page).toHaveURL(new RegExp(`/${e2eEnv.tenantSlug}/pedido/`));
    await expect(
      page.getByRole("heading", { name: /compra realizada com sucesso/i }),
    ).toBeVisible();
  });

  test("stock shortage blocks checkout updates and does not create a sale", async ({
    page,
  }, testInfo) => {
    await loginCustomer(page);
    const checkoutId = checkoutForProject(testInfo.project.name, "stock");
    const checkout = await getCheckout(page, checkoutId);

    const patchResponse = await page.request.patch(checkoutUrl(checkoutId), {
      data: {
        tickets: checkout.tickets.map((ticket) => ({
          seat_id: ticket.seat_id,
          ticket_type: ticket.ticket_type,
        })),
        concession_items: checkout.concession_items.map((item) => ({
          item_type: item.item_type,
          item_id: item.item_id,
          quantity: 999,
        })),
      },
      headers: tenantHeaders(),
    });
    expect(patchResponse.status()).toBe(409);
    expect(await patchResponse.text()).toMatch(/estoque insuficiente/i);

    const status = await getStatus(page, checkoutId);
    expect(status.sale_id).toBeFalsy();
    expect(status.checkout_status).not.toBe("paid");
  });

  test("checkout rejects seats without the active reservation", async ({
    page,
  }) => {
    await loginCustomer(page);
    const checkout = await getCheckout(page, e2eEnv.checkoutId);

    const response = await page.request.post(
      `${e2eEnv.apiBaseUrl}/v1/customer/checkout-sessions`,
      {
        data: {
          tenant_slug: e2eEnv.tenantSlug,
          showtime_id: checkout.showtime_id,
          reservation_uuid: "web-e2e-wrong-reservation",
          tickets: checkout.tickets.map((ticket) => ({
            seat_id: ticket.seat_id,
            ticket_type: ticket.ticket_type,
          })),
        },
        headers: tenantHeaders(),
      },
    );

    expect(response.status()).toBe(409);
    expect(await response.text()).toMatch(/reserva expirada|outro checkout|ocupado/i);
  });
});
