'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import UploadDropzone from '@/components/UploadDropzone';
import ImageCard from '@/components/ImageCard';
import MetadataFiltersComponent, {
  MetadataFilters,
} from '@/components/MetadataFilters';
import FaceFilterBar from '@/components/FaceFilterBar';

interface Tag {
  id: string;
  name: string;
  imageCount?: number;
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

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Camera {
  make: string;
  model: string;
  count: number;
}

const GalleryPage = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedFaceIds, setSelectedFaceIds] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [metadataFilters, setMetadataFilters] = useState<MetadataFilters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: metadataFilters.sortBy,
        sortOrder: metadataFilters.sortOrder,
      });

      if (search) {
        params.append('search', search);
      }

      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','));
      }

      // Add face filter
      if (selectedFaceIds.length > 0) {
        params.append('faces', selectedFaceIds.join(','));
      }

      // Add metadata filters
      if (metadataFilters.dateFrom) {
        params.append('dateFrom', metadataFilters.dateFrom);
      }
      if (metadataFilters.dateTo) {
        params.append('dateTo', metadataFilters.dateTo);
      }
      if (metadataFilters.cameraMake) {
        params.append('cameraMake', metadataFilters.cameraMake);
      }
      if (metadataFilters.cameraModel) {
        params.append('cameraModel', metadataFilters.cameraModel);
      }
      if (metadataFilters.hasGPS !== undefined) {
        params.append('hasGPS', metadataFilters.hasGPS.toString());
      }

      const response = await fetch(`/api/images?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setImages(data.images);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();

      if (response.ok) {
        setTags(data.tags);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const fetchCameras = async () => {
    try {
      const response = await fetch('/api/images/cameras');
      const data = await response.json();

      if (response.ok) {
        setCameras(data.cameras);
      }
    } catch (error) {
      console.error('Failed to fetch cameras:', error);
    }
  };

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, search, selectedTags, selectedFaceIds, metadataFilters]);

  useEffect(() => {
    fetchTags();
    fetchCameras();
  }, []);

  const handleUploadSuccess = () => {
    setIsUploadDialogOpen(false);
    fetchImages();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchImages();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleMetadataFiltersChange = (newFilters: MetadataFilters) => {
    setMetadataFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFaceSelect = (faceId: string) => {
    setSelectedFaceIds((prev) =>
      prev.includes(faceId)
        ? prev.filter((id) => id !== faceId)
        : [...prev, faceId]
    );
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFacesChange = () => {
    fetchImages();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Images</h1>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>Upload Image</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload New Image</DialogTitle>
              <DialogDescription>
                Upload a new image to your gallery. Supports JPEG, PNG, WebP,
                and GIF formats.
              </DialogDescription>
            </DialogHeader>
            <UploadDropzone onUploadSuccess={handleUploadSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="search"
            placeholder="Search images..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">Search</Button>
        </form>

        {tags.length > 0 && (
          <div className="space-y-2">
            <Label>Filter by tags:</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                  {tag.imageCount !== undefined && ` (${tag.imageCount})`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Filters */}
        <MetadataFiltersComponent
          filters={metadataFilters}
          onChange={handleMetadataFiltersChange}
          cameras={cameras}
        />

        {/* Face Filter Bar */}
        <FaceFilterBar
          selectedFaceIds={selectedFaceIds}
          onFaceSelect={handleFaceSelect}
          onFacesChange={handleFacesChange}
        />
      </div>

      {/* Image Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No images found</p>
          <p className="text-gray-400 text-sm mt-2">
            Upload your first image to get started
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onDelete={() => fetchImages()}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GalleryPage;
