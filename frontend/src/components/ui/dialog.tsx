'use client';

import * as React from 'react';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;

  return (
    <>
      <div
        className='fixed inset-0 z-50 bg-black/50'
        onClick={() => onOpenChange(false)}
      />
      <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
        {children}
      </div>
    </>
  );
};

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onClose }, ref) => (
    <div
      ref={ref}
      className={`relative max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl border border-gray-200 bg-white shadow-lg ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {onClose && (
        <button
          onClick={onClose}
          className='absolute right-4 top-4 text-gray-500 hover:text-gray-700'
        >
          <X className='h-5 w-5' />
        </button>
      )}
      {children}
    </div>
  )
);
DialogContent.displayName = 'DialogContent';

interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, children }, ref) => (
    <div ref={ref} className={`space-y-1.5 border-b border-gray-200 p-6 ${className}`}>
      {children}
    </div>
  )
);
DialogHeader.displayName = 'DialogHeader';

interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, children }, ref) => (
    <h2
      ref={ref}
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
    >
      {children}
    </h2>
  )
);
DialogTitle.displayName = 'DialogTitle';

interface DialogBodyProps {
  className?: string;
  children: React.ReactNode;
}

const DialogBody = React.forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ className, children }, ref) => (
    <div ref={ref} className={`p-6 ${className}`}>
      {children}
    </div>
  )
);
DialogBody.displayName = 'DialogBody';

interface DialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, children }, ref) => (
    <div ref={ref} className={`border-t border-gray-200 p-6 ${className}`}>
      {children}
    </div>
  )
);
DialogFooter.displayName = 'DialogFooter';

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
};
