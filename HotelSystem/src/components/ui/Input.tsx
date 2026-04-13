import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    hint,
    icon,
    className = '',
    ...props 
  }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-semibold text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-4 py-3 rounded-lg
              border-2 border-border
              bg-white
              text-foreground placeholder-text-muted
              transition-all duration-200
              focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
              disabled:bg-secondary/30 disabled:cursor-not-allowed disabled:opacity-50
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-error focus:border-error focus:ring-error/20' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-error font-medium">{error}</p>
        )}
        {hint && !error && (
          <p className="text-sm text-text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
