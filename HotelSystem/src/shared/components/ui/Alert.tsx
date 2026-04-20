import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { AlertCircle, Info } from 'lucide-react';

type AlertVariant = 'error' | 'info';

type AlertProps = Omit<HTMLMotionProps<'div'>, 'ref' | 'children'> & {
  variant?: AlertVariant;
  showIcon?: boolean;
  children?: ReactNode;
};

const stylesByVariant: Record<AlertVariant, string> = {
  error: 'bg-error/5 border-error/20 text-error shadow-sm',
  info: 'bg-primary/5 border-primary/20 text-primary shadow-sm',
};

const iconsByVariant: Record<AlertVariant, any> = {
  error: AlertCircle,
  info: Info,
};

export default function Alert({ className, variant = 'info', children, showIcon = true, ...props }: AlertProps) {
  const Icon = iconsByVariant[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className={cn(
        'p-5 rounded-2xl border flex items-start gap-4 font-medium transition-all',
        stylesByVariant[variant],
        className
      )}
      {...props}
    >
      {showIcon && (
        <div className={cn(
          'p-2 rounded-xl shrink-0',
          variant === 'error' ? 'bg-error/10' : 'bg-primary/10'
        )}>
          <Icon size={18} />
        </div>
      )}
      <div className="flex-1 pt-1.5 leading-relaxed">
        {children}
      </div>
    </motion.div>
  );
}
