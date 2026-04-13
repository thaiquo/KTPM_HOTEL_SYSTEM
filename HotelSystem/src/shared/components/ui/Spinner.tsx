import { cn } from '../../lib/cn';

type SpinnerProps = {
  className?: string;
};

export default function Spinner({ className }: SpinnerProps) {
  return (
    <span
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-4 border-gray-300 border-t-orange-500',
        className
      )}
    />
  );
}
