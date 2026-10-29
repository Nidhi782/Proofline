import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            type={type}
            className={cn(
              'flex h-10 w-full rounded-lg border bg-slate-900/80 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner backdrop-blur-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/80 focus-visible:border-indigo-500',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-red-500/80 focus-visible:ring-red-500/60'
                : 'border-slate-800 hover:border-slate-700',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-400 mt-1 flex items-center gap-1 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-slate-400 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
