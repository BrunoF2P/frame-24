"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { extractErrorMessage } from "@/lib/error-utils";
import {
  useConfirmEmailChangeMutation,
  useRequestEmailChangeMutation,
} from "@/hooks/use-customer-profile";
import { Button } from "@/components/ui/button";
import { DialogShell, DialogShellHeader } from "@/components/ui/dialog-shell";
import { Field, FieldLabel } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/catalog";

export const EmailChangeFlowDialog = ({ currentEmail }: { currentEmail: string | null }) => {
  const requestMutation = useRequestEmailChangeMutation();
  const confirmMutation = useConfirmEmailChangeMutation();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({ newEmail: "" });
  const [confirmForm, setConfirmForm] = useState({ requestId: "", token: "" });

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const response = await requestMutation.mutateAsync(requestForm.newEmail);
      const payload = response.data as { request_id?: string; expires_at?: string };
      if (payload.request_id) {
        setConfirmForm((state) => ({ ...state, requestId: payload.request_id || state.requestId }));
      }
      setFeedback(copy("profileEmailDialogRequested"));
    } catch (error) {
      setFeedback(extractErrorMessage(error, copy("profileEmailDialogRequestError")));
    }
  };

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    try {
      await confirmMutation.mutateAsync({
        request_id: confirmForm.requestId,
        token: confirmForm.token,
      });
      setFeedback(copy("profileEmailDialogConfirmed"));
      setTimeout(() => setOpen(false), 700);
    } catch (error) {
      setFeedback(extractErrorMessage(error, copy("profileEmailDialogConfirmError")));
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm" variant="secondary">
          <Icon name="email" size="sm" />
          {copy("profileEmailDialogTrigger")}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55" />
        <Dialog.Content className="fixed inset-0 z-50 overflow-y-auto p-4 md:flex md:items-center md:justify-center">
          <DialogShell className="mx-auto w-full max-w-2xl rounded-[var(--radius-lg)] border border-border bg-background-elevated p-5">
            <DialogShellHeader
              title={copy("profileEmailDialogTitle")}
              description={copy("profileEmailDialogDescription")}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <form className="space-y-3 rounded-[var(--radius-md)] border border-border p-4" onSubmit={handleRequest}>
                <p className="text-xs uppercase tracking-[0.16em] text-foreground-muted">{copy("profileEmailDialogStepRequest")}</p>
                <Field>
                  <FieldLabel htmlFor="current-email">{copy("profileEmailDialogCurrentEmail")}</FieldLabel>
                  <Input id="current-email" value={currentEmail || ""} readOnly />
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-email">{copy("profileEmailDialogNewEmail")}</FieldLabel>
                  <Input
                    id="new-email"
                    type="email"
                    value={requestForm.newEmail}
                    onChange={(event) =>
                      setRequestForm((state) => ({ ...state, newEmail: event.target.value }))
                    }
                    placeholder={copy("profileEmailDialogNewEmailPlaceholder")}
                    required
                  />
                </Field>
                <Button disabled={requestMutation.isPending} size="sm" type="submit">
                  {requestMutation.isPending ? copy("profileEmailDialogSending") : copy("profileEmailDialogSendConfirm")}
                </Button>
              </form>
              <form className="space-y-3 rounded-[var(--radius-md)] border border-border p-4" onSubmit={handleConfirm}>
                <p className="text-xs uppercase tracking-[0.16em] text-foreground-muted">{copy("profileEmailDialogStepConfirm")}</p>
                <Field>
                  <FieldLabel htmlFor="request-id">{copy("profileEmailDialogRequestId")}</FieldLabel>
                  <Input
                    id="request-id"
                    value={confirmForm.requestId}
                    onChange={(event) =>
                      setConfirmForm((state) => ({ ...state, requestId: event.target.value }))
                    }
                    placeholder={copy("profileEmailDialogRequestPlaceholder")}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm-token">{copy("profileEmailDialogToken")}</FieldLabel>
                  <Input
                    id="confirm-token"
                    value={confirmForm.token}
                    onChange={(event) =>
                      setConfirmForm((state) => ({ ...state, token: event.target.value }))
                    }
                    placeholder={copy("profileEmailDialogTokenPlaceholder")}
                    required
                  />
                </Field>
                <Button disabled={confirmMutation.isPending} size="sm" type="submit" variant="secondary">
                  {confirmMutation.isPending ? copy("profileEmailDialogConfirming") : copy("profileEmailDialogConfirm")}
                </Button>
              </form>
            </div>
            {feedback ? (
              <p className="mt-3 text-sm text-foreground-muted">{feedback}</p>
            ) : null}
          </DialogShell>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
