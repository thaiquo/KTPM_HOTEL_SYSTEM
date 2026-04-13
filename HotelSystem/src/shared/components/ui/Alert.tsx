import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type AlertVariant = 'error' | 'info';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

const stylesByVariant: Record<AlertVariant, string> = {
  error: 'bg-red-50 border border-red-200 text-red-700',
  info: 'bg-orange-50 border border-orange-200 text-orange-800',
};

export default function Alert({ className, variant = 'info', ...props }: AlertProps) {
  return (
    <div
      {...props}
      role="alert"
      className={cn('p-4 rounded-xl', stylesByVariant[variant], className)}
    />
  );
}
