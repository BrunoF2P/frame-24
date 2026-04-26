"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  getTenantSlugFromHost,
  getTenantSlugFromPathname,
  withTenantPath,
} from "@/lib/tenant-routing";
import { toTenantAuthEmail } from "@/lib/tenant-auth-email";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip-toggle";
import { DialogShell, DialogShellHeader } from "@/components/ui/dialog-shell";
import { Field, FieldLabel } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { copy, copyList } from "@/lib/copy/catalog";

type AuthView = "login" | "register";

export const AuthModal = ({ mobileIconOnly = false }: { mobileIconOnly?: boolean }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { hasSession, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AuthView>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const tenantSlug =
    (typeof window !== "undefined" ? getTenantSlugFromHost(window.location.host) : null) ??
    getTenantSlugFromPathname(pathname);
  const displayName = user?.name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  const points =
    typeof user?.accumulated_points === "number"
      ? `${user.accumulated_points} pts`
      : null;

  if (hasSession) {
    return (
      <Button
        asChild
        aria-label="Abrir perfil"
        variant="secondary"
        size="sm"
        className={cn(
          "min-w-10 justify-center gap-2 px-3",
          mobileIconOnly && "w-10 px-0 md:w-auto md:px-3",
        )}
      >
        <Link href={withTenantPath(pathname, "/perfil")}>
          <Icon name="user" size="sm" />
          <span className={cn("hidden max-w-40 truncate md:inline", mobileIconOnly && "sr-only md:not-sr-only")}>
            {displayName || "Perfil"}
          </span>
          {points ? (
            <span className="hidden rounded-full border border-border/80 px-2 py-0.5 text-xs text-foreground-muted xl:inline">
              {points}
            </span>
          ) : null}
        </Link>
      </Button>
    );
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await authClient.signIn.email({
        email: tenantSlug
          ? toTenantAuthEmail(tenantSlug, loginForm.email)
          : loginForm.email.trim().toLowerCase(),
        password: loginForm.password,
      });

      if (result.error) {
        setError(result.error.message || copy("authErrorSignIn"));
        return;
      }

      setOpen(false);
      router.push(withTenantPath(pathname, "/perfil"));
    } catch {
      setError(copy("authErrorSignInRetry"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      setOpen(false);
      router.push(withTenantPath(pathname, "/auth/register"));
    } catch {
      setError(copy("authErrorSignUpRetry"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          aria-label={copy("headerEnter")}
          variant="secondary"
          size="sm"
          className={cn(
            mobileIconOnly && "w-10 justify-center px-0 md:w-auto md:px-3.5",
          )}
        >
          {mobileIconOnly ? <Icon name="user" size="sm" /> : null}
          <span className={cn(mobileIconOnly && "sr-only md:not-sr-only")}>
            {copy("headerEnter")}
          </span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55" />
        <Dialog.Content className="fixed inset-0 z-50 overflow-y-auto md:flex md:items-center md:justify-center md:p-6">
          <DialogShell>
            <div className="grid min-h-screen md:min-h-0 md:grid-cols-[1fr_1.1fr]">
              <aside className="relative hidden border-r border-border/70 bg-surface p-8 md:block">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-red-500/10 via-transparent to-gold-300/10" />
                <div className="relative">
                  <p className="text-xs uppercase tracking-[0.14em] text-accent-red-500">{copy("brandName")}</p>
                  <h3 className="mt-3 text-3xl font-semibold leading-tight text-foreground">
                    {copy("authTitle")}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-foreground-muted">
                    {copy("authDescription")}
                  </p>
                  <div className="mt-8 space-y-3">
                    {copyList(
                      "authBenefitOrders",
                      "authBenefitFastRecovery",
                      "authBenefitFastCheckout",
                    ).map((item) => (
                      <div
                        key={item}
                        className="rounded-[var(--radius-md)] border border-border bg-background px-4 py-3 text-sm text-foreground-muted"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
              <div className="mx-auto flex w-full max-w-lg flex-col justify-center p-5 sm:p-7 md:p-8">
                <DialogShellHeader
                  title={view === "login" ? copy("authPanelTitleLogin") : copy("authPanelTitleRegister")}
                  description={copy("authPanelDescription")}
                />

                <div className="mb-6 grid grid-cols-2 gap-1 rounded-[var(--radius-lg)] border border-border bg-surface p-1">
                  <ChipToggle
                    onClick={() => setView("login")}
                    className={cn(
                      "h-10 rounded-[var(--radius-md)] px-3 py-2.5 text-sm",
                      view === "login" && "bg-background text-foreground shadow-[0_1px_0_rgba(0,0,0,0.06)]",
                    )}
                    active={view === "login"}
                  >
                    {copy("authTabLogin")}
                  </ChipToggle>
                  <ChipToggle
                    onClick={() => setView("register")}
                    className={cn(
                      "h-10 rounded-[var(--radius-md)] px-3 py-2.5 text-sm",
                      view === "register" && "bg-background text-foreground shadow-[0_1px_0_rgba(0,0,0,0.06)]",
                    )}
                    active={view === "register"}
                  >
                    {copy("authTabRegister")}
                  </ChipToggle>
                </div>

                <div className="mb-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">
                    {copy("authContinueWith")}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: copy("authProviderGoogle"), mark: "G" },
                      { label: copy("authProviderApple"), icon: true },
                      { label: copy("authProviderFacebook"), mark: "f" },
                    ].map((provider) => (
                      <Button
                        key={provider.label}
                        type="button"
                        disabled
                        aria-label={provider.label}
                        variant="secondary"
                        size="lg"
                        className="h-12"
                      >
                        {provider.icon ? (
                          <Icon name="apple" size="md" />
                        ) : (
                          <span className="text-base font-bold">{provider.mark}</span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-3 text-xs uppercase tracking-[0.12em] text-foreground-muted md:bg-background-elevated">
                      {copy("authOrEmailPassword")}
                    </span>
                  </div>
                </div>

                {error ? (
                  <div className="mb-4 flex items-start gap-3 rounded-[var(--radius-md)] border border-danger/20 bg-danger/8 p-4 text-sm text-danger">
                    <Icon name="error" size="sm" className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                {view === "login" ? (
                  <form className="space-y-4" onSubmit={handleLogin}>
                    <Field>
                      <FieldLabel htmlFor="auth-login-email" className="text-foreground">
                        {copy("authEmailLabel")}
                      </FieldLabel>
                      <Input
                        id="auth-login-email"
                        type="email"
                        required
                        placeholder={copy("authEmailPlaceholder")}
                        value={loginForm.email}
                        onChange={(event) =>
                          setLoginForm((state) => ({ ...state, email: event.target.value }))
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="auth-login-password" className="text-foreground">
                        {copy("authPasswordLabel")}
                      </FieldLabel>
                      <Input
                        id="auth-login-password"
                        type="password"
                        required
                        placeholder={copy("authPasswordPlaceholder")}
                        value={loginForm.password}
                        onChange={(event) =>
                          setLoginForm((state) => ({ ...state, password: event.target.value }))
                        }
                      />
                    </Field>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-12 w-full"
                      size="lg"
                    >
                      {loading ? <Icon name="loader" size="sm" className="animate-spin" /> : null}
                      {copy("authTabLogin")}
                    </Button>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={handleRegister}>
                    <Field>
                      <FieldLabel htmlFor="auth-register-name" className="text-foreground">
                        {copy("authNameLabel")}
                      </FieldLabel>
                      <Input
                        id="auth-register-name"
                        type="text"
                        required
                        placeholder={copy("authNamePlaceholder")}
                        value={registerForm.name}
                        onChange={(event) =>
                          setRegisterForm((state) => ({ ...state, name: event.target.value }))
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="auth-register-email" className="text-foreground">
                        {copy("authEmailLabel")}
                      </FieldLabel>
                      <Input
                        id="auth-register-email"
                        type="email"
                        required
                        placeholder={copy("authEmailPlaceholder")}
                        value={registerForm.email}
                        onChange={(event) =>
                          setRegisterForm((state) => ({ ...state, email: event.target.value }))
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="auth-register-password" className="text-foreground">
                        {copy("authPasswordLabel")}
                      </FieldLabel>
                      <Input
                        id="auth-register-password"
                        type="password"
                        required
                        minLength={8}
                        placeholder={copy("authPasswordHint")}
                        value={registerForm.password}
                        onChange={(event) =>
                          setRegisterForm((state) => ({ ...state, password: event.target.value }))
                        }
                      />
                    </Field>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-12 w-full"
                      size="lg"
                    >
                      {loading ? <Icon name="loader" size="sm" className="animate-spin" /> : null}
                      {copy("authTabRegister")}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </DialogShell>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
