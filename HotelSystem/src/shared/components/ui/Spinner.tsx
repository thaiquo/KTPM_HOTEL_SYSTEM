import { cn } from '../../lib/cn';

type SpinnerProps = {
  className?: string;
};

export default function Spinner({ className }: SpinnerProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
       <span
         className="absolute w-full h-full rounded-full border-4 border-primary/10"
       />
       <span
         aria-label="Loading"
         className="w-full h-full rounded-full border-4 border-transparent border-t-primary animate-spin"
       />
    </div>
  );
}
