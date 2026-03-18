'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { H3, Muted } from '@/components/ui/typography';

export interface MetadataFilters {
  dateFrom?: string;
  dateTo?: string;
  cameraMake?: string;
  cameraModel?: string;
  hasGPS?: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface Camera {
  make: string;
  model: string;
  count: number;
}

interface MetadataFiltersProps {
  filters: MetadataFilters;
  onChange: (filters: MetadataFilters) => void;
  cameras?: Camera[];
}

const MetadataFiltersComponent = ({
  filters,
  onChange,
  cameras = [],
}: MetadataFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDateFromChange = (value: string) => {
    onChange({ ...filters, dateFrom: value || undefined });
  };

  const handleDateToChange = (value: string) => {
    onChange({ ...filters, dateTo: value || undefined });
  };

  const handleCameraChange = (value: string) => {
    if (value === 'all') {
      onChange({
        ...filters,
        cameraMake: undefined,
        cameraModel: undefined,
      });
    } else {
      const [make, model] = value.split('|');
      onChange({ ...filters, cameraMake: make, cameraModel: model });
    }
  };

  const handleGPSFilterChange = (value: string) => {
    onChange({
      ...filters,
      hasGPS: value === 'with-gps' ? true : value === 'no-gps' ? false : undefined,
    });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('_');
    onChange({
      ...filters,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc',
    });
  };

  const clearFilters = () => {
    onChange({
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  const activeFilterCount =
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.cameraMake ? 1 : 0) +
    (filters.hasGPS !== undefined ? 1 : 0);

  const getCameraLabel = () => {
    if (filters.cameraMake && filters.cameraModel) {
      return `${filters.cameraMake} ${filters.cameraModel}`;
    }
    return 'All cameras';
  };

  const getGPSLabel = () => {
    if (filters.hasGPS === true) return 'With location';
    if (filters.hasGPS === false) return 'Without location';
    return 'All photos';
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Sort Options */}
      <div className="flex items-center gap-2">
        <Muted>Sort:</Muted>
        <Select
          value={`${filters.sortBy}_${filters.sortOrder}`}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt_desc">Newest first</SelectItem>
            <SelectItem value="createdAt_asc">Oldest first</SelectItem>
            <SelectItem value="dateTaken_desc">Date taken (newest)</SelectItem>
            <SelectItem value="dateTaken_asc">Date taken (oldest)</SelectItem>
            <SelectItem value="originalName_asc">Name (A-Z)</SelectItem>
            <SelectItem value="originalName_desc">Name (Z-A)</SelectItem>
            <SelectItem value="size_desc">Size (largest)</SelectItem>
            <SelectItem value="size_asc">Size (smallest)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filters Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="default"
                className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <H3 className="text-foreground">Filters</H3>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto p-1 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm">Date taken range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => handleDateFromChange(e.target.value)}
                    className="text-sm"
                    placeholder="From"
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => handleDateToChange(e.target.value)}
                    className="text-sm"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>

            {/* Camera Filter */}
            {cameras.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Camera</Label>
                <Select
                  value={
                    filters.cameraMake && filters.cameraModel
                      ? `${filters.cameraMake}|${filters.cameraModel}`
                      : 'all'
                  }
                  onValueChange={handleCameraChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select camera">
                      {getCameraLabel()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cameras</SelectItem>
                    {cameras.map((camera, idx) => (
                      <SelectItem
                        key={idx}
                        value={`${camera.make}|${camera.model}`}
                      >
                        {camera.make} {camera.model} ({camera.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* GPS Filter */}
            <div className="space-y-2">
              <Label className="text-sm">Location data</Label>
              <Select
                value={
                  filters.hasGPS === true
                    ? 'with-gps'
                    : filters.hasGPS === false
                    ? 'no-gps'
                    : 'all'
                }
                onValueChange={handleGPSFilterChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{getGPSLabel()}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All photos</SelectItem>
                  <SelectItem value="with-gps">With location</SelectItem>
                  <SelectItem value="no-gps">Without location</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Badges */}
      {filters.dateFrom && (
        <Badge variant="secondary" className="gap-1">
          From: {new Date(filters.dateFrom).toLocaleDateString()}
          <button
            onClick={() => handleDateFromChange('')}
            className="ml-1 hover:text-red-600 cursor-pointer"
            aria-label="Clear date from filter"
          >
            ×
          </button>
        </Badge>
      )}
      {filters.dateTo && (
        <Badge variant="secondary" className="gap-1">
          To: {new Date(filters.dateTo).toLocaleDateString()}
          <button
            onClick={() => handleDateToChange('')}
            className="ml-1 hover:text-red-600 cursor-pointer"
            aria-label="Clear date to filter"
          >
            ×
          </button>
        </Badge>
      )}
      {filters.cameraMake && (
        <Badge variant="secondary" className="gap-1">
          📷 {filters.cameraMake} {filters.cameraModel}
          <button
            onClick={() => handleCameraChange('all')}
            className="ml-1 hover:text-red-600 cursor-pointer"
            aria-label="Clear camera filter"
          >
            ×
          </button>
        </Badge>
      )}
      {filters.hasGPS !== undefined && (
        <Badge variant="secondary" className="gap-1">
          📍 {filters.hasGPS ? 'With location' : 'No location'}
          <button
            onClick={() => handleGPSFilterChange('all')}
            className="ml-1 hover:text-red-600 cursor-pointer"
            aria-label="Clear location filter"
          >
            ×
          </button>
        </Badge>
      )}
    </div>
  );
};

export default MetadataFiltersComponent;
