"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import type { CustomerOrder } from "@/types/customer-profile";
import { extractErrorMessage } from "@/lib/error-utils";
import { useCreateRefundRequestMutation } from "@/hooks/use-customer-profile";
import { Button } from "@/components/ui/button";
import { DialogShell, DialogShellHeader } from "@/components/ui/dialog-shell";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/catalog";

type SelectedItem = {
  item_type: "ticket" | "concession";
  item_id: string;
  quantity?: number;
};

export const RefundRequestModal = ({
  order,
}: {
  order: CustomerOrder;
}) => {
  const mutation = useCreateRefundRequestMutation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({});

  const refundableItems = useMemo(
    () => order.order_items.filter((item) => item.refund_eligibility.eligible),
    [order.order_items],
  );

  const toggleSelection = (item: CustomerOrder["order_items"][number]) => {
    setSelectedItems((state) => {
      if (state[item.reference_id]) {
        const clone = { ...state };
        delete clone[item.reference_id];
        return clone;
      }

      return {
        ...state,
        [item.reference_id]: {
          item_type: item.item_type,
          item_id: item.reference_id,
          quantity: item.item_type === "concession" ? 1 : undefined,
        },
      };
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setSelectedItems((state) => ({
      ...state,
      [itemId]: state[itemId]
        ? {
            ...state[itemId],
            quantity,
          }
        : {
            item_type: "concession",
            item_id: itemId,
            quantity,
          },
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    const items = Object.values(selectedItems);
    if (!items.length) {
      setFeedback(copy("profileOrderDetailsRefundSelectOne"));
      return;
    }

    try {
      await mutation.mutateAsync({
        orderId: order.id,
        reason,
        items,
      });
      setFeedback(copy("profileOrderDetailsRefundCreated"));
      setTimeout(() => setOpen(false), 700);
    } catch (error) {
      setFeedback(extractErrorMessage(error, copy("profileOrderDetailsRefundError")));
    }
  };

  if (!order.can_request_refund) {
    return null;
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm">{copy("profileOrderDetailsRefundTrigger")}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55" />
        <Dialog.Content className="fixed inset-0 z-50 overflow-y-auto p-4 md:flex md:items-center md:justify-center">
          <DialogShell className="mx-auto w-full max-w-3xl rounded-[var(--radius-lg)] border border-border bg-background-elevated p-5">
            <DialogShellHeader
              title={copy("profileOrderDetailsRefundTitle")}
              description={copy("profileOrderDetailsRefundSubtitle")}
            />
            <form className="space-y-4" onSubmit={handleSubmit}>
              <ul className="space-y-2">
                {order.order_items.map((item) => {
                  const selected = !!selectedItems[item.reference_id];
                  const disabled = !item.refund_eligibility.eligible;
                  return (
                    <li key={item.id} className="rounded-[var(--radius-md)] border border-border p-3">
                      <label className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-2">
                            <input
                              checked={selected}
                              disabled={disabled}
                              onChange={() => toggleSelection(item)}
                              type="checkbox"
                            />
                            <span className="font-medium">{item.label}</span>
                          </div>
                          <p className="text-xs text-foreground-muted">
                            {item.item_type === "ticket" ? copy("profileOrderDetailsTicketType") : copy("profileOrderDetailsConcessionType")} · Quantidade {item.quantity}
                          </p>
                          {!item.refund_eligibility.eligible ? (
                            <p className="text-xs text-foreground-muted">{item.refund_eligibility.reason}</p>
                          ) : null}
                        </div>
                        {item.item_type === "concession" && selected ? (
                          <Input
                            className="w-20"
                            min={1}
                            max={item.quantity}
                            onChange={(event) =>
                              updateQuantity(
                                item.reference_id,
                                Number(event.target.value) || 1,
                              )
                            }
                            type="number"
                            value={selectedItems[item.reference_id]?.quantity ?? 1}
                          />
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
              {refundableItems.length === 0 ? (
                <p className="text-sm text-foreground-muted">
                  {copy("profileOrderDetailsRefundNoItems")}
                </p>
              ) : null}
              <Field>
                <FieldLabel htmlFor="refund-reason">{copy("profileOrderDetailsRefundReason")}</FieldLabel>
                <Input
                  id="refund-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={copy("profileOrderDetailsRefundReasonPlaceholder")}
                />
              </Field>
              {feedback ? <p className="text-sm text-foreground-muted">{feedback}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button disabled={mutation.isPending} size="sm" type="submit">
                  {mutation.isPending ? copy("profileOrderDetailsRefundSubmitting") : copy("profileOrderDetailsRefundSubmit")}
                </Button>
                <Dialog.Close asChild>
                  <Button size="sm" type="button" variant="secondary">
                    {copy("profileOrderDetailsRefundClose")}
                  </Button>
                </Dialog.Close>
              </div>
            </form>
          </DialogShell>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
