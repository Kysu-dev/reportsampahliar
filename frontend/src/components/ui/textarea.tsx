'use client';

import * as React from 'react';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className='space-y-1.5'>
        {label && (
          <label className='block text-sm font-medium text-gray-700'>
            {label}
          </label>
        )}
        <textarea
          className={`flex min-h-24 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:opacity-50 resize-none ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''
          } ${className}`}
          ref={ref}
          {...props}
        />
        {error && <p className='text-xs text-red-500'>{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
