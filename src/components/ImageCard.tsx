'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

interface Tag {
  id: string;
  name: string;
}

interface ImageData {
  id: string;
  filename: string;
  originalName: string;
  filepath: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  tags?: Tag[];
}

interface ImageCardProps {
  image: ImageData;
  onDelete?: () => void;
}

const ImageCard = ({ image, onDelete }: ImageCardProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/images/${image.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete?.();
      } else {
        alert('Failed to delete image');
      }
    } catch (_error) {
      alert('An error occurred while deleting the image');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/images/${image.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (_error) {
      alert('Failed to download image');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/images/${image.id}`}>
        <CardContent className="p-0 relative aspect-square">
          <Image
            src={image.filepath}
            alt={image.originalName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </CardContent>
      </Link>
      <CardFooter className="flex flex-col items-start p-4 space-y-2">
        <div className="w-full flex items-center justify-between">
          <p className="font-medium text-sm truncate flex-1">
            {image.originalName}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/images/${image.id}`}>View Details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="w-full flex items-center justify-between text-xs text-gray-500">
          <span>{formatSize(image.size)}</span>
          <span>{formatDate(image.createdAt)}</span>
        </div>
        {image.tags && image.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {image.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default ImageCard;
