export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export const normalizeRole = (role?: string | null): UserRole => {
  if (!role) return 'CUSTOMER';

  const upperRole = role.toUpperCase();
  if (upperRole === 'ADMIN') return 'ADMIN';
  if (upperRole === 'STAFF') return 'STAFF';

  return 'CUSTOMER';
};

export const getManagementHomeByRole = (role?: string | null): string => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'ADMIN') return '/admin';
  if (normalizedRole === 'STAFF') return '/staff';

  return '/';
};