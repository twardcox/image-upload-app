'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  updatedAt: string;
  tags: Tag[];
}

const ImageDetailPage = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const imageId = params?.id;
  const [image, setImage] = useState<ImageData | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    if (!imageId) return;
    fetchImage();
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId]);

  const fetchImage = async () => {
    if (!imageId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/images/${imageId}`);
      const data = await response.json();

      if (response.ok) {
        setImage(data.image);
        setSelectedTagIds(data.image.tags.map((t: Tag) => t.id));
      } else {
        alert('Image not found');
        router.push('/gallery');
      }
    } catch (_error) {
      console.error('Failed to fetch image:', _error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();

      if (response.ok) {
        setAllTags(data.tags);
      }
    } catch (_error) {
      console.error('Failed to fetch tags:', _error);
    }
  };

  const handleDelete = async () => {
    if (!imageId) return;
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/gallery');
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
    if (!imageId) return;
    try {
      const response = await fetch(`/api/images/${imageId}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image?.originalName || 'image';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Failed to download image');
    }
  };

  const handleRotate = async (direction: 'left' | 'right') => {
    if (!imageId) return;
    setIsRotating(true);
    try {
      const response = await fetch(`/api/images/${imageId}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });

      const data = await response.json();

      if (response.ok) {
        setImage((prev) => (prev ? { ...prev, ...data.image } : prev));
      } else {
        alert(data.error || 'Failed to rotate image');
      }
    } catch {
      alert('An error occurred while rotating the image');
    } finally {
      setIsRotating(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName }),
      });

      const data = await response.json();

      if (response.ok) {
        setAllTags((prev) => [...prev, data.tag]);
        setSelectedTagIds((prev) => [...prev, data.tag.id]);
        setNewTagName('');
      }
    } catch (_error) {
      console.error('Failed to create tag:', _error);
    }
  };

  const handleSaveTags = async () => {
    if (!imageId) return;
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: selectedTagIds }),
      });

      if (response.ok) {
        const data = await response.json();
        setImage(data.image);
        setIsEditingTags(false);
      } else {
        alert('Failed to update tags');
      }
    } catch {
      alert('An error occurred while updating tags');
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!image) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/gallery">
          <Button variant="outline">← Back to Gallery</Button>
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleRotate('left')}
            disabled={isRotating}
          >
            Rotate Left
          </Button>
          <Button
            variant="outline"
            onClick={() => handleRotate('right')}
            disabled={isRotating}
          >
            Rotate Right
          </Button>
          <Button onClick={handleDownload}>Download</Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || isRotating}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-0 relative aspect-square">
            <Image
              src={image.filepath}
              alt={image.originalName}
              fill
              unoptimized
              className="object-contain"
              priority
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Image Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Muted>Name</Muted>
                <P className="font-medium">{image.originalName}</P>
              </div>
              <div>
                <Muted>File Size</Muted>
                <P className="font-medium">{formatSize(image.size)}</P>
              </div>
              {image.width && image.height && (
                <div>
                  <Muted>Dimensions</Muted>
                  <P className="font-medium">
                    {image.width} × {image.height} px
                  </P>
                </div>
              )}
              <div>
                <Muted>Type</Muted>
                <P className="font-medium">{image.mimeType}</P>
              </div>
              <div>
                <Muted>Uploaded</Muted>
                <P className="font-medium">{formatDate(image.createdAt)}</P>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tags</CardTitle>
                <Dialog open={isEditingTags} onOpenChange={setIsEditingTags}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Edit Tags
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Tags</DialogTitle>
                      <DialogDescription>
                        Select tags to apply to this image
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {allTags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant={
                              selectedTagIds.includes(tag.id)
                                ? 'default'
                                : 'outline'
                            }
                            className="cursor-pointer"
                            onClick={() => toggleTag(tag.id)}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <Label>Create New Tag</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Tag name"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateTag();
                              }
                            }}
                          />
                          <Button onClick={handleCreateTag}>Add</Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditingTags(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveTags}>Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {image.tags.length === 0 ? (
                <Muted>No tags assigned</Muted>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {image.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ImageDetailPage;
