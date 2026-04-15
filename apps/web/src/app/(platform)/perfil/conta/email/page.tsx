"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProfileShell } from "@/components/profile/profile-shell";
import { ProfileAuthState } from "@/components/profile/profile-auth-state";
import {
  useConfirmEmailChangeMutation,
  useCustomerProfileQuery,
} from "@/hooks/use-customer-profile";
import { extractErrorMessage } from "@/lib/error-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/catalog";

export default function ProfileEmailConfirmPage() {
  const searchParams = useSearchParams();
  const requestFromUrl = searchParams.get("request_id") ?? "";
  const tokenFromUrl = searchParams.get("token") ?? "";
  const profileQuery = useCustomerProfileQuery();
  const confirmMutation = useConfirmEmailChangeMutation();
  const [requestId, setRequestId] = useState(requestFromUrl);
  const [token, setToken] = useState(tokenFromUrl);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    try {
      await confirmMutation.mutateAsync({
        request_id: requestId,
        token,
      });
      setFeedback(copy("profileEmailPageUpdated"));
    } catch (error) {
      setFeedback(extractErrorMessage(error, copy("profileEmailPageError")));
    }
  };

  if (profileQuery.isLoading) {
    return (
      <ProfileShell title={copy("profileEmailPageTitle")} description={copy("profileEmailPageDescription")}>
        <Card>{copy("profileEmailPageLoading")}</Card>
      </ProfileShell>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ProfileShell title={copy("profileEmailPageTitle")} description={copy("profileEmailPageDescription")}>
        <ProfileAuthState />
      </ProfileShell>
    );
  }

  return (
    <ProfileShell title={copy("profileEmailPageTitle")} description={copy("profileEmailPageDescription")}>
      <Card className="space-y-4">
        <p className="text-sm text-foreground-muted">
          {copy("profileEmailPageHelp")}
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor="confirm-request-id">{copy("profileEmailDialogRequestId")}</FieldLabel>
            <Input
              id="confirm-request-id"
              onChange={(event) => setRequestId(event.target.value)}
              required
              value={requestId}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-token">{copy("profileEmailDialogToken")}</FieldLabel>
            <Input
              id="confirm-token"
              onChange={(event) => setToken(event.target.value)}
              required
              value={token}
            />
          </Field>
          <Button disabled={confirmMutation.isPending} size="sm" type="submit">
            {confirmMutation.isPending ? copy("profileEmailDialogConfirming") : copy("profileEmailDialogConfirm")}
          </Button>
        </form>
        {feedback ? <p className="text-sm text-foreground-muted">{feedback}</p> : null}
      </Card>
    </ProfileShell>
  );
}
