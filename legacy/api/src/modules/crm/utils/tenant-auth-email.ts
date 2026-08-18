const EMAIL_ALIAS_SEPARATOR = '__tenant__';

export function toTenantAuthEmail(tenantSlug: string, email: string): string {
  const normalizedTenant = tenantSlug.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  const [localPart, domain] = normalizedEmail.split('@');

  if (!normalizedTenant || !localPart || !domain) {
    return normalizedEmail;
  }

  return `${localPart}${EMAIL_ALIAS_SEPARATOR}${normalizedTenant}@${domain}`;
}

export function fromTenantAuthEmail(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const [localPart, domain] = normalizedEmail.split('@');

  if (!localPart || !domain || !localPart.includes(EMAIL_ALIAS_SEPARATOR)) {
    return normalizedEmail;
  }

  return `${localPart.split(EMAIL_ALIAS_SEPARATOR)[0]}@${domain}`;
}
