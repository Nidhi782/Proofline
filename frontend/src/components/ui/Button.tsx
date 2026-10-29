import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 border border-indigo-500/30',
        outline:
          'border border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-600 backdrop-blur-sm',
        ghost:
          'text-slate-300 hover:bg-slate-800/80 hover:text-white',
        destructive:
          'bg-red-600/90 text-white shadow-md shadow-red-600/20 hover:bg-red-500 border border-red-500/30',
        success:
          'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 border border-emerald-500/30',
        secondary:
          'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700/60',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 py-2 text-sm',
        lg: 'h-12 px-6 text-base font-medium',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
