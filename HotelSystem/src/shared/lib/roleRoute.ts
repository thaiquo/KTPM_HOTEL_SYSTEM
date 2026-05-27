export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF' | 'EMPLOYEE' | 'RECEPTIONIST' | 'CUSTOMER' | 'USER';

export const normalizeRole = (role?: string | null): string => {
  if (!role) return 'CUSTOMER';

  const upperRole = role.toUpperCase();
  if (['ADMIN', 'MANAGER'].includes(upperRole)) return 'ADMIN';
  if (['STAFF', 'EMPLOYEE', 'RECEPTIONIST'].includes(upperRole)) return 'STAFF';

  return 'CUSTOMER';
};

export const getManagementHomeByRole = (role?: string | null): string => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'ADMIN') return '/admin';
  if (normalizedRole === 'STAFF') return '/staff';

  return '/';
};