import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={clsx(
            'input resize-y min-h-[80px] w-full',
            error && 'border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
