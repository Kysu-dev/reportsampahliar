'use client';

import React from 'react';
import { toast as sonnerToast, Toaster } from 'sonner';

export function Toaster_() {
  return (
    <Toaster
      position='top-right'
      richColors
      closeButton
      expand
      visibleToasts={5}
    />
  );
}

export const toast = {
  success: (message: string, description?: string) =>
    sonnerToast.success(message, { description }),
  error: (message: string, description?: string) =>
    sonnerToast.error(message, { description }),
  info: (message: string, description?: string) =>
    sonnerToast.info(message, { description }),
  loading: (message: string) => sonnerToast.loading(message),
  promise: <T,>(
    message: string,
    promise: Promise<T>
  ) => sonnerToast.promise(promise, { loading: message }),
};
