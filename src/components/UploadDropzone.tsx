'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lead, Muted } from '@/components/ui/typography';

interface UploadDropzoneProps {
  onUploadSuccess?: () => void;
}

const UploadDropzone = ({ onUploadSuccess }: UploadDropzoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFiles(Array.from(files));
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Upload failed for ${file.name}`);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setError('');
    setSuccess('');
    setIsUploading(true);

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('No valid image files selected');
      setIsUploading(false);
      return;
    }

    let successCount = 0;
    const failedFiles: string[] = [];

    try {
      for (const file of imageFiles) {
        try {
          await uploadFile(file);
          successCount += 1;
        } catch {
          failedFiles.push(file.name);
        }
      }

      if (successCount > 0 && failedFiles.length === 0) {
        setSuccess(
          successCount === 1
            ? `${imageFiles[0].name} uploaded successfully!`
            : `${successCount} images uploaded successfully!`
        );
      } else if (successCount > 0 && failedFiles.length > 0) {
        setSuccess(`${successCount} images uploaded successfully.`);
        setError(`Failed to upload: ${failedFiles.join(', ')}`);
      } else {
        setError('All uploads failed. Please try again.');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (successCount > 0) {
        onUploadSuccess?.();
      }
    } catch {
      setError('An error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="space-y-4">
          <div className="text-4xl">📷</div>
          <div>
            <Lead className="font-medium text-foreground">Drag and drop your image here</Lead>
            <Muted>or click the button below to select one or more files</Muted>
          </div>
          <Button
            type="button"
            onClick={handleButtonClick}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Select Images'}
          </Button>
          <Muted className="text-xs">Supports: JPEG, PNG, WebP, GIF (Max 10MB each)</Muted>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default UploadDropzone;
