import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'flat';
  hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    variant = 'elevated', 
    hover = false, 
    className = '',
    children,
    ...props 
  }, ref) => {
    const baseStyles = 'bg-white rounded-xl overflow-hidden transition-all duration-300';
    
    const variants = {
      elevated: 'shadow-md hover:shadow-lg',
      outlined: 'border-2 border-border',
      flat: 'bg-secondary/30',
    };
    
    const hoverEffect = hover ? 'hover:-translate-y-1 hover:shadow-xl' : '';
    
    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${hoverEffect} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/* Card Image - Premium image container */
export const CardImage = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`relative h-64 overflow-hidden bg-gradient-to-br from-secondary to-border ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardImage.displayName = 'CardImage';

/* Card Content - Body with premium spacing */
export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`p-6 space-y-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

/* Card Header - Title area */
export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`space-y-1 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

/* Card Title - Premium title styling */
export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement> & { children: React.ReactNode }>(
  ({ className = '', children, ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-xl lg:text-2xl font-bold text-foreground ${className}`}
      {...props}
    >
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

/* Card Description - Muted text */
export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement> & { children: React.ReactNode }>(
  ({ className = '', children, ...props }, ref) => (
    <p
      ref={ref}
      className={`text-text-muted text-sm lg:text-base ${className}`}
      {...props}
    >
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';
