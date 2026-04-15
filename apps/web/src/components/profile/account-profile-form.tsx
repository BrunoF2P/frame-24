"use client";

import { useState } from "react";
import type { CustomerProfileFull } from "@/types/customer-profile";
import { extractErrorMessage } from "@/lib/error-utils";
import { useUpdateCustomerProfileMutation } from "@/hooks/use-customer-profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/catalog";

export const AccountProfileForm = ({
  profile,
}: {
  profile: CustomerProfileFull;
}) => {
  const updateMutation = useUpdateCustomerProfileMutation();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: profile.full_name || "",
    phone: profile.phone || "",
    birth_date: profile.birth_date ? profile.birth_date.slice(0, 10) : "",
  });
  const [preferences, setPreferences] = useState({
    accepts_email: Boolean(profile.accepts_email),
    accepts_sms: Boolean(profile.accepts_sms),
    accepts_marketing: Boolean(profile.accepts_marketing),
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    try {
      await updateMutation.mutateAsync({
        full_name: form.full_name,
        phone: form.phone || null,
        birth_date: form.birth_date || null,
        accepts_email: preferences.accepts_email,
        accepts_sms: preferences.accepts_sms,
        accepts_marketing: preferences.accepts_marketing,
      });
      setFeedback(copy("profileAccountUpdated"));
    } catch (error) {
      setFeedback(extractErrorMessage(error, copy("profileAccountUpdateError")));
    }
  };

  return (
    <Card className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">{copy("profileAccountPersonalTitle")}</h2>
        <p className="text-sm text-foreground-muted">{copy("profileAccountPersonalDescription")}</p>
      </header>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field>
          <FieldLabel htmlFor="profile-full-name">Nome completo</FieldLabel>
          <Input
            id="profile-full-name"
            value={form.full_name}
            onChange={(event) => setForm((state) => ({ ...state, full_name: event.target.value }))}
            required
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="profile-phone">Telefone</FieldLabel>
            <Input
              id="profile-phone"
              value={form.phone}
              onChange={(event) => setForm((state) => ({ ...state, phone: event.target.value }))}
              placeholder={copy("profileAccountPhonePlaceholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-birth-date">{copy("profileAccountBirthDate")}</FieldLabel>
            <Input
              id="profile-birth-date"
              type="date"
              value={form.birth_date}
              onChange={(event) =>
                setForm((state) => ({ ...state, birth_date: event.target.value }))
              }
            />
          </Field>
        </div>
        <fieldset className="space-y-3 rounded-[var(--radius-md)] border border-border bg-background-strong/40 p-4">
          <legend className="px-1 text-xs uppercase tracking-[0.18em] text-foreground-muted">
            {copy("profileAccountCommunicationPreferences")}
          </legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={preferences.accepts_email}
              onChange={(event) =>
                setPreferences((state) => ({
                  ...state,
                  accepts_email: event.target.checked,
                }))
              }
              type="checkbox"
            />
            {copy("profileAccountAcceptEmail")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={preferences.accepts_sms}
              onChange={(event) =>
                setPreferences((state) => ({
                  ...state,
                  accepts_sms: event.target.checked,
                }))
              }
              type="checkbox"
            />
            {copy("profileAccountAcceptSms")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={preferences.accepts_marketing}
              onChange={(event) =>
                setPreferences((state) => ({
                  ...state,
                  accepts_marketing: event.target.checked,
                }))
              }
              type="checkbox"
            />
            {copy("profileAccountAcceptMarketing")}
          </label>
        </fieldset>
        {feedback ? <p className="text-sm text-foreground-muted">{feedback}</p> : null}
        <Button disabled={updateMutation.isPending} size="sm" type="submit">
          {updateMutation.isPending ? copy("profileAccountSaving") : copy("profileAccountSave")}
        </Button>
      </form>
    </Card>
  );
};
