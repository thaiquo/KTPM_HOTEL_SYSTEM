import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({ className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        'bg-surface-container-low rounded-xl border border-outline-variant/10 shadow-2xl',
        className
      )}
    />
  );
}
