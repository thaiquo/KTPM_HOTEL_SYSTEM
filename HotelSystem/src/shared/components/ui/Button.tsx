import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'outline' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
};

const stylesByVariant: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-primary to-primary-container text-on-primary-container hover:opacity-90 shadow-lg shadow-primary-container/15 disabled:opacity-50 disabled:cursor-not-allowed',
  outline:
    'border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed',
};

export default function Button({
  className,
  variant = 'primary',
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-headline font-bold transition px-5 py-3 tracking-tight active:scale-[0.98]',
        stylesByVariant[variant],
        className
      )}
    >
      {children}
    </button>
  );
}
