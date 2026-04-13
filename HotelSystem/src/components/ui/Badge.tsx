import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ 
    variant = 'primary', 
    size = 'sm',
    className = '',
    children,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center font-semibold rounded-full whitespace-nowrap';
    
    const variants = {
      primary: 'bg-primary/10 text-primary',
      secondary: 'bg-secondary text-foreground',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      error: 'bg-error/10 text-error',
    };
    
    const sizes = {
      sm: 'px-2.5 py-1 text-xs',
      md: 'px-3.5 py-1.5 text-sm',
    };
    
    return (
      <span
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
