"use client";

import { useState } from "react";
import { extractErrorMessage } from "@/lib/error-utils";
import {
  useRequestDataExportMutation,
  useRequestDeleteAccountMutation,
} from "@/hooks/use-customer-profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/catalog";

export const PrivacyCenterPanel = () => {
  const exportMutation = useRequestDataExportMutation();
  const deleteMutation = useRequestDeleteAccountMutation();
  const [deleteReason, setDeleteReason] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleExport = async () => {
    setFeedback(null);
    try {
      const result = await exportMutation.mutateAsync();
      setFeedback(`${copy("profilePrivacyExportCreatedPrefix")} ${result.request_id}.`);
    } catch (error) {
      setFeedback(extractErrorMessage(error, copy("profilePrivacyExportError")));
    }
  };

  const handleDeleteRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const result = await deleteMutation.mutateAsync({
        reason: deleteReason || undefined,
        confirm_phrase: confirmPhrase,
      });
      const response = result.data as { request_id?: string };
      setFeedback(`${copy("profilePrivacyDeleteCreatedPrefix")} ${response.request_id || "ok"}.`);
      setConfirmPhrase("");
      setDeleteReason("");
    } catch (error) {
      setFeedback(extractErrorMessage(error, copy("profilePrivacyDeleteError")));
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-xl font-semibold">{copy("profilePrivacyExportTitle")}</h2>
        <p className="text-sm text-foreground-muted">
          {copy("profilePrivacyExportDescription")}
        </p>
        <Button disabled={exportMutation.isPending} onClick={handleExport} size="sm" type="button">
          {exportMutation.isPending ? copy("profilePrivacyExportRequesting") : copy("profilePrivacyExportRequest")}
        </Button>
      </Card>
      <Card className="space-y-3">
        <h2 className="text-xl font-semibold">{copy("profilePrivacyDeleteTitle")}</h2>
        <p className="text-sm text-foreground-muted">
          {copy("profilePrivacyDeleteDescription")}
        </p>
        <form className="space-y-3" onSubmit={handleDeleteRequest}>
          <Field>
            <FieldLabel htmlFor="delete-reason">{copy("profilePrivacyDeleteReason")}</FieldLabel>
            <Input
              id="delete-reason"
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              placeholder={copy("profilePrivacyDeleteReasonPlaceholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="delete-confirm">
              {copy("profilePrivacyDeleteConfirmLabel")}
            </FieldLabel>
            <Input
              id="delete-confirm"
              value={confirmPhrase}
              onChange={(event) => setConfirmPhrase(event.target.value)}
              placeholder={copy("profilePrivacyDeleteConfirmPlaceholder")}
              required
            />
          </Field>
          <Button disabled={deleteMutation.isPending} size="sm" type="submit" variant="secondary">
            {deleteMutation.isPending ? copy("profilePrivacyDeleteSubmitting") : copy("profilePrivacyDeleteSubmit")}
          </Button>
        </form>
      </Card>
      {feedback ? <p className="text-sm text-foreground-muted">{feedback}</p> : null}
    </div>
  );
};
