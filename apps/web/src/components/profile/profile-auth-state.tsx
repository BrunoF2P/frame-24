"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { copy } from "@/lib/copy/catalog";

export const ProfileAuthState = ({
  title = copy("profileAuthTitle"),
  description = copy("profileAuthDescription"),
}: {
  title?: string;
  description?: string;
}) => (
  <Card className="space-y-4">
    <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-border bg-background-strong">
      <Icon name="user" size="md" />
    </div>
    <div className="space-y-1">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-foreground-muted">{description}</p>
    </div>
    <Button asChild size="sm">
      <Link href="/">{copy("profileAuthBackHome")}</Link>
    </Button>
  </Card>
);
