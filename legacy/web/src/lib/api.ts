import axios from "axios";
import {
  getTenantSlugFromHost,
  getTenantSlugFromPathname,
} from "@/lib/tenant-routing";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/v1`
    : "http://localhost:4000/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }

  const tenantSlug =
    getTenantSlugFromHost(window.location.host) ??
    getTenantSlugFromPathname(window.location.pathname);
  if (!tenantSlug) {
    return config;
  }

  config.headers = config.headers ?? {};
  if (!("x-tenant-slug" in config.headers)) {
    config.headers["x-tenant-slug"] = tenantSlug;
  }

  return config;
});
