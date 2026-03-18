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
import { Muted, P } from '@/components/ui/typography';

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
  updatedAt?: string;
  tags?: Tag[];
  // EXIF metadata
  dateTaken?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  cameraMake?: string | null;
  cameraModel?: string | null;
  fNumber?: number | null;
  exposureTime?: string | null;
  iso?: number | null;
  focalLength?: number | null;
}

interface ImageCardProps {
  image: ImageData;
  onDelete?: () => void;
  eagerLoad?: boolean;
}

const ImageCard = ({ image, onDelete, eagerLoad = false }: ImageCardProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const handleRotate = async (direction: 'left' | 'right') => {
    setIsRotating(true);
    try {
      const response = await fetch(`/api/images/${image.id}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });

      const data = await response.json();

      if (response.ok) {
        onDelete?.();
      } else {
        alert(data.error || 'Failed to rotate image');
      }
    } catch {
      alert('An error occurred while rotating the image');
    } finally {
      setIsRotating(false);
    }
  };

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
    } catch {
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
    } catch {
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatGPS = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
  };

  const hasExifData = Boolean(
    image.cameraMake ||
    image.cameraModel ||
    image.dateTaken ||
    image.gpsLatitude
  );

  const imageSrc = image.filepath;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/images/${image.id}`}>
        <CardContent className="p-0 relative aspect-square">
          <Image
            src={imageSrc}
            alt={image.originalName}
            fill
            loading={eagerLoad ? 'eager' : 'lazy'}
            priority={eagerLoad}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </CardContent>
      </Link>
      <CardFooter className="flex flex-col items-start p-4 space-y-2">
        <div className="w-full flex items-center justify-between">
          <P className="font-medium text-sm truncate flex-1 leading-normal">
            {image.originalName}
          </P>
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
                onClick={() => handleRotate('left')}
                disabled={isRotating || isDeleting}
              >
                {isRotating ? 'Rotating...' : 'Rotate Left'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRotate('right')}
                disabled={isRotating || isDeleting}
              >
                {isRotating ? 'Rotating...' : 'Rotate Right'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting || isRotating}
                className="text-red-600"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="w-full flex items-center justify-between">
          <Muted className="text-xs leading-none">{formatSize(image.size)}</Muted>
          <Muted className="text-xs leading-none">{formatDate(image.createdAt)}</Muted>
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
        {hasExifData && (
          <div className="w-full pt-2 border-t space-y-1">
            {image.dateTaken && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="opacity-70">📅</span>
                <Muted className="truncate text-xs leading-none">{formatDateTime(image.dateTaken)}</Muted>
              </div>
            )}
            {(image.cameraMake || image.cameraModel) && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="opacity-70">📷</span>
                <Muted className="truncate text-xs leading-none">
                  {[image.cameraMake, image.cameraModel]
                    .filter(Boolean)
                    .join(' ')}
                </Muted>
              </div>
            )}
            {image.gpsLatitude !== null &&
              image.gpsLatitude !== undefined &&
              image.gpsLongitude !== null &&
              image.gpsLongitude !== undefined && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="opacity-70">📍</span>
                  <Muted className="truncate font-mono text-[10px] leading-none">
                    {formatGPS(image.gpsLatitude, image.gpsLongitude)}
                  </Muted>
                </div>
              )}
            {(image.fNumber || image.iso || image.exposureTime) && (
              <div className="flex items-center gap-2">
                {image.fNumber && <Muted className="text-xs leading-none">f/{image.fNumber}</Muted>}
                {image.exposureTime && <Muted className="text-xs leading-none">{image.exposureTime}s</Muted>}
                {image.iso && <Muted className="text-xs leading-none">ISO {image.iso}</Muted>}
                {image.focalLength && <Muted className="text-xs leading-none">{image.focalLength}mm</Muted>}
              </div>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default ImageCard;
