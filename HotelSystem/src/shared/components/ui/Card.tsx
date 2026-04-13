import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({ className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn('bg-white rounded-2xl shadow', className)}
    />
  );
}
