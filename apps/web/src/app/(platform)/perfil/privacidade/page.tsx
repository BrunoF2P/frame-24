"use client";

import { PrivacyCenterPanel } from "@/components/profile/privacy-center-panel";
import { ProfileAuthState } from "@/components/profile/profile-auth-state";
import { ProfileShell } from "@/components/profile/profile-shell";
import { useCustomerProfileQuery } from "@/hooks/use-customer-profile";
import { Card } from "@/components/ui/card";
import { copy } from "@/lib/copy/catalog";

export default function ProfilePrivacyPage() {
  const profileQuery = useCustomerProfileQuery();

  if (profileQuery.isLoading) {
    return (
      <ProfileShell title={copy("profilePrivacyTitle")} description={copy("profilePrivacyDescription")}>
        <Card>{copy("profilePrivacyLoading")}</Card>
      </ProfileShell>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ProfileShell title={copy("profilePrivacyTitle")} description={copy("profilePrivacyDescription")}>
        <ProfileAuthState />
      </ProfileShell>
    );
  }

  return (
    <ProfileShell title={copy("profilePrivacyTitle")} description={copy("profilePrivacyDescription")}>
      <PrivacyCenterPanel />
    </ProfileShell>
  );
}
