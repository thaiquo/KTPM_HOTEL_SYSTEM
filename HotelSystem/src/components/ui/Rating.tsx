import React from 'react';
import { Star } from 'lucide-react';

interface RatingProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
  ({ 
    value, 
    max = 5, 
    count,
    size = 'md',
    interactive = false,
    onChange,
    className = '',
    ...props 
  }, ref) => {
    const [hoverValue, setHoverValue] = React.useState(0);
    
    const sizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };
    
    const displayValue = hoverValue || value;
    
    return (
      <div
        ref={ref}
        className={`flex items-center gap-2 ${className}`}
        {...props}
      >
        <div className="flex gap-1">
          {Array.from({ length: max }).map((_, i) => {
            const starValue = i + 1;
            const isFilled = starValue <= displayValue;
            
            return (
              <button
                key={i}
                type="button"
                disabled={!interactive}
                onClick={() => interactive && onChange?.(starValue)}
                onMouseEnter={() => interactive && setHoverValue(starValue)}
                onMouseLeave={() => interactive && setHoverValue(0)}
                className={`${sizes[size]} transition-all cursor-pointer`}
              >
                <Star
                  className={`w-full h-full ${
                    isFilled
                      ? 'fill-warning text-warning'
                      : 'fill-border text-border'
                  }`}
                />
              </button>
            );
          })}
        </div>
        {count !== undefined && (
          <span className="text-sm text-text-muted ml-1">
            ({count})
          </span>
        )}
      </div>
    );
  }
);

Rating.displayName = 'Rating';
