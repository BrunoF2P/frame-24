const EMAIL_ALIAS_SEPARATOR = "__tenant__";

export const toTenantAuthEmail = (tenantSlug: string, email: string) => {
  const normalizedTenant = tenantSlug.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  const [localPart, domain] = normalizedEmail.split("@");

  if (!normalizedTenant || !localPart || !domain) {
    return normalizedEmail;
  }

  return `${localPart}${EMAIL_ALIAS_SEPARATOR}${normalizedTenant}@${domain}`;
};
