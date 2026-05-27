const pad = (value: number) => String(value).padStart(2, '0');

const formatDateParts = (year: number, month: number, day: number) => {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
  return `${year}-${pad(month)}-${pad(day)}`;
};

export const normalizeDateInputValue = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return formatDateParts(Number(slashMatch[3]), Number(slashMatch[2]), Number(slashMatch[1]));
  }

  const dashMatch = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    return formatDateParts(Number(dashMatch[3]), Number(dashMatch[2]), Number(dashMatch[1]));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';

  return formatDateParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
};

export const formatDateDisplay = (value?: string | null, fallback = 'Chưa có dữ liệu') => {
  const normalized = normalizeDateInputValue(value);
  if (!normalized) return fallback;

  const [year, month, day] = normalized.split('-');
  return `${day}/${month}/${year}`;
};
