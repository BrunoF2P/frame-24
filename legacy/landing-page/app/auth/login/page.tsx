import { redirect } from "next/navigation";

const DEFAULT_ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://lawtrel.dev/admin";

export default async function LandingLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl =
    params.callbackUrl && params.callbackUrl.startsWith("/")
      ? params.callbackUrl
      : undefined;

  const adminLoginUrl = new URL("/admin/login", DEFAULT_ADMIN_URL);
  if (callbackUrl && callbackUrl !== "/") {
    adminLoginUrl.searchParams.set("callbackUrl", callbackUrl);
  }

  redirect(adminLoginUrl.toString());
}
