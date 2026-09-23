export type AdminLoginLookup = {
  hasActiveMembership(email: string): Promise<boolean>;
  hasPendingInvitation(email: string): Promise<boolean>;
  hasActiveOwner(): Promise<boolean>;
};

export async function isAdminLoginEligible(
  rawEmail: string,
  bootstrapOwnerEmail: string | null,
  lookup: AdminLoginLookup,
) {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (await lookup.hasActiveMembership(email)) return true;
  if (await lookup.hasPendingInvitation(email)) return true;
  return bootstrapOwnerEmail === email && !(await lookup.hasActiveOwner());
}
