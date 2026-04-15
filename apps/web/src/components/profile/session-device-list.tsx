"use client";

import type { ActiveSessionDevice } from "@/types/customer-profile";
import {
  useRevokeOtherSessionsMutation,
  useRevokeSessionMutation,
} from "@/hooks/use-customer-profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { copy } from "@/lib/copy/catalog";

export const SessionDeviceList = ({
  sessions,
}: {
  sessions: ActiveSessionDevice[];
}) => {
  const revokeMutation = useRevokeSessionMutation();
  const revokeOthersMutation = useRevokeOtherSessionsMutation();

  return (
    <Card className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{copy("profileSecurityPanelTitle")}</h2>
          <p className="text-sm text-foreground-muted">
            {copy("profileSecurityPanelDescription")}
          </p>
        </div>
        <Button
          disabled={revokeOthersMutation.isPending}
          onClick={() => revokeOthersMutation.mutate(sessions.find((item) => item.is_current)?.id)}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Icon name="x" size="sm" />
          {copy("profileSecurityRevokeOthers")}
        </Button>
      </header>
      <ul className="space-y-2">
        {sessions.map((session) => (
          <li key={session.id} className="rounded-[var(--radius-md)] border border-border p-3">
            <article className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="space-y-1">
                <p className="font-medium">{session.device_label}</p>
                <p className="text-xs text-foreground-muted">
                  {session.ip_address || copy("profileSecuritySessionNoIp")} ·{" "}
                  {session.last_activity
                    ? new Date(session.last_activity).toLocaleString("pt-BR")
                    : copy("profileSecuritySessionNoActivity")}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {session.is_current ? <Badge variant="success">{copy("profileSecuritySessionCurrent")}</Badge> : null}
                  <Badge variant="neutral">{copy("profileSecuritySessionExpiresPrefix")} {new Date(session.expires_at).toLocaleDateString("pt-BR")}</Badge>
                </div>
              </div>
              <Button
                disabled={session.is_current || revokeMutation.isPending}
                onClick={() => revokeMutation.mutate(session.id)}
                size="sm"
                type="button"
                variant="quiet"
              >
                {copy("profileSecuritySessionClose")}
              </Button>
            </article>
          </li>
        ))}
      </ul>
      {revokeMutation.isSuccess || revokeOthersMutation.isSuccess ? (
        <p className="text-sm text-foreground-muted">{copy("profileSecuritySessionUpdated")}</p>
      ) : null}
    </Card>
  );
};
