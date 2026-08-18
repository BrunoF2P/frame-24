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

export const AddressForm = ({
  profile,
}: {
  profile: CustomerProfileFull;
}) => {
  const updateMutation = useUpdateCustomerProfileMutation();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({
    zip_code: profile.zip_code || "",
    address: profile.address || "",
    city: profile.city || "",
    state: profile.state || "",
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    try {
      await updateMutation.mutateAsync({
        zip_code: form.zip_code || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
      });
      setFeedback(copy("profileAddressUpdated"));
    } catch (error) {
      setFeedback(extractErrorMessage(error, copy("profileAddressUpdateError")));
    }
  };

  return (
    <Card className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">{copy("profileAddressTitle")}</h2>
        <p className="text-sm text-foreground-muted">
          {copy("profileAddressDescription")}
        </p>
      </header>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <Field>
            <FieldLabel htmlFor="profile-zip-code">CEP</FieldLabel>
            <Input
              id="profile-zip-code"
              value={form.zip_code}
              onChange={(event) => setForm((state) => ({ ...state, zip_code: event.target.value }))}
              placeholder={copy("profileAddressZipPlaceholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-address">Endereço</FieldLabel>
            <Input
              id="profile-address"
              value={form.address}
              onChange={(event) => setForm((state) => ({ ...state, address: event.target.value }))}
              placeholder={copy("profileAddressStreetPlaceholder")}
            />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_120px]">
          <Field>
            <FieldLabel htmlFor="profile-city">Cidade</FieldLabel>
            <Input
              id="profile-city"
              value={form.city}
              onChange={(event) => setForm((state) => ({ ...state, city: event.target.value }))}
              placeholder={copy("profileAddressCityPlaceholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-state">UF</FieldLabel>
            <Input
              id="profile-state"
              value={form.state}
              onChange={(event) =>
                setForm((state) => ({ ...state, state: event.target.value.toUpperCase() }))
              }
              maxLength={2}
              placeholder={copy("profileAddressStatePlaceholder")}
            />
          </Field>
        </div>
        {feedback ? <p className="text-sm text-foreground-muted">{feedback}</p> : null}
        <Button disabled={updateMutation.isPending} size="sm" type="submit" variant="secondary">
          {updateMutation.isPending ? copy("profileAccountSaving") : copy("profileAddressSave")}
        </Button>
      </form>
    </Card>
  );
};
