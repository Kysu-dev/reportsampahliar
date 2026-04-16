'use client';

import { useState } from 'react';

interface UseFileUploadOptions {
  multiple?: boolean;
  maxFiles?: number;
}

function isLikelyImage(file: File): boolean {
  if (file.type.startsWith('image/')) {
    return true;
  }

  const normalizedName = file.name.trim().toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif|svg)$/.test(normalizedName);
}

function toImageFiles(fileList: FileList | File[]): File[] {
  return Array.from(fileList).filter((file) => isLikelyImage(file));
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { multiple = true, maxFiles = 10 } = options;
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const mergeFiles = (incomingFiles: File[]) => {
    if (incomingFiles.length === 0) {
      return;
    }

    if (!multiple) {
      setFiles([incomingFiles[0]]);
      return;
    }

    setFiles((previousFiles) => [...previousFiles, ...incomingFiles].slice(0, maxFiles));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    mergeFiles(toImageFiles(e.dataTransfer.files));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    mergeFiles(toImageFiles(e.target.files || []));

    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    if (index < 0) {
      setFiles([]);
      return;
    }

    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return {
    files,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    removeFile,
    setFiles,
  };
}
