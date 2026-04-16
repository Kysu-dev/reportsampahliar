'use client';

import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default:
        'bg-green-100 text-green-800 border border-green-200',
      secondary:
        'bg-gray-100 text-gray-800 border border-gray-200',
      success:
        'bg-emerald-100 text-emerald-800 border border-emerald-200',
      warning:
        'bg-yellow-100 text-yellow-800 border border-yellow-200',
      destructive:
        'bg-red-100 text-red-800 border border-red-200',
    };

    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-none ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
