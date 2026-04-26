import { test } from "@playwright/test";

export const e2eEnv = {
  tenantSlug: process.env.E2E_TENANT_SLUG || "lawtrel-admin",
  citySlug: process.env.E2E_CITY_SLUG || "salvador",
  movieSlug: process.env.E2E_MOVIE_SLUG || "aventuras-no-atlantico",
  checkoutId:
    process.env.E2E_CHECKOUT_ID || "31313131-3131-4131-8131-313131313131",
  paidCheckoutDesktopId: "35353535-3535-4353-8353-353535353535",
  failedCheckoutDesktopId: "38383838-3838-4383-8383-383838383838",
  paidCheckoutMobileId: "40404040-4040-4404-8404-404040404040",
  failedCheckoutMobileId: "43434343-4343-4434-8434-434343434343",
  pixCheckoutDesktopId: "46464646-4646-4464-8464-464646464646",
  pixCheckoutMobileId: "48484848-4848-4484-8484-484848484848",
  stockCheckoutDesktopId: "50505050-5050-4505-8505-505050505050",
  stockCheckoutMobileId: "53535353-5353-4535-8535-535353535353",
  orderId: process.env.E2E_ORDER_ID,
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  customerEmail:
    process.env.E2E_CUSTOMER_EMAIL || "cliente.e2e@frame24.local",
  customerPassword:
    process.env.E2E_CUSTOMER_PASSWORD || "Frame24E2E#2026",
};

export const requireEnv = (...keys: Array<keyof typeof e2eEnv>) => {
  const missing = keys.filter((key) => !e2eEnv[key]);
  test.skip(missing.length > 0, `Missing E2E env: ${missing.join(", ")}`);
};
