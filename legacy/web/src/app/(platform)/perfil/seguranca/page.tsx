"use client";

import { ProfileAuthState } from "@/components/profile/profile-auth-state";
import { ProfileShell } from "@/components/profile/profile-shell";
import { SessionDeviceList } from "@/components/profile/session-device-list";
import {
  useCustomerProfileQuery,
  useCustomerSecuritySessionsQuery,
} from "@/hooks/use-customer-profile";
import { Card } from "@/components/ui/card";
import { copy } from "@/lib/copy/catalog";

export default function ProfileSecurityPage() {
  const profileQuery = useCustomerProfileQuery();
  const sessionsQuery = useCustomerSecuritySessionsQuery();

  if (profileQuery.isLoading || sessionsQuery.isLoading) {
    return (
      <ProfileShell title={copy("profileSecurityTitle")} description={copy("profileSecurityDescription")}>
        <Card>{copy("profileSecurityLoading")}</Card>
      </ProfileShell>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ProfileShell title={copy("profileSecurityTitle")} description={copy("profileSecurityDescription")}>
        <ProfileAuthState />
      </ProfileShell>
    );
  }

  return (
    <ProfileShell title={copy("profileSecurityTitle")} description={copy("profileSecurityDescription")}>
      <SessionDeviceList sessions={sessionsQuery.data ?? []} />
    </ProfileShell>
  );
}
