import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'outline' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
};

const stylesByVariant: Record<ButtonVariant, string> = {
  primary:
    'bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed',
  outline:
    'border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
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
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition px-4 py-2',
        stylesByVariant[variant],
        className
      )}
    >
      {children}
    </button>
  );
}
