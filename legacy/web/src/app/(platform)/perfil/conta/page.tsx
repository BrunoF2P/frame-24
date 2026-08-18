"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountProfileForm } from "@/components/profile/account-profile-form";
import { AddressForm } from "@/components/profile/address-form";
import { EmailChangeFlowDialog } from "@/components/profile/email-change-flow-dialog";
import { ProfileAuthState } from "@/components/profile/profile-auth-state";
import { ProfileShell } from "@/components/profile/profile-shell";
import { useCustomerProfileQuery } from "@/hooks/use-customer-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/catalog";
import { withTenantPath } from "@/lib/tenant-routing";

export default function ProfileAccountPage() {
  const pathname = usePathname();
  const profileQuery = useCustomerProfileQuery();

  if (profileQuery.isLoading) {
    return (
      <ProfileShell
        title={copy("profileAccountTitle")}
        description={copy("profileAccountDescription")}
      >
        <Card>{copy("profileAccountLoading")}</Card>
      </ProfileShell>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ProfileShell
        title={copy("profileAccountTitle")}
        description={copy("profileAccountDescription")}
      >
        <ProfileAuthState />
      </ProfileShell>
    );
  }

  const profile = profileQuery.data;

  return (
    <ProfileShell
      title={copy("profileAccountTitle")}
      description={copy("profileAccountDescription")}
    >
      <div className="space-y-4">
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-foreground-muted">{copy("profileAccountEmailLabel")}</p>
            <p className="font-semibold">{profile.email || "Não informado"}</p>
          </div>
          <div className="flex items-center gap-2">
            <EmailChangeFlowDialog currentEmail={profile.email} />
            <Button asChild size="sm" variant="quiet">
              <Link href={withTenantPath(pathname, "/perfil/conta/email")}>{copy("profileAccountOpenEmailPage")}</Link>
            </Button>
          </div>
        </Card>
        <AccountProfileForm profile={profile} />
        <AddressForm profile={profile} />
      </div>
    </ProfileShell>
  );
}
