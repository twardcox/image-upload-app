'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Face {
  id: string;
  name: string | null;
  thumbnailPath: string;
  imageCount: number;
}

interface FaceFilterBarProps {
  selectedFaceIds: string[];
  onFaceSelect: (faceId: string) => void;
  onFacesChange: () => void;
}

const FaceFilterBar = ({
  selectedFaceIds,
  onFaceSelect,
  onFacesChange,
}: FaceFilterBarProps) => {
  const [faces, setFaces] = useState<Face[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [editingFace, setEditingFace] = useState<Face | null>(null);
  const [editName, setEditName] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  const fetchFaces = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/faces?limit=100');
      const data = await response.json();

      if (response.ok) {
        setFaces(data.faces);
      }
    } catch (error) {
      console.error('Failed to fetch faces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFaces();
  }, []);

  const handleNameUpdate = async () => {
    if (!editingFace) return;

    try {
      const response = await fetch(`/api/faces/${editingFace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName || null }),
      });

      if (response.ok) {
        await fetchFaces();
        setEditingFace(null);
        setEditName('');
        onFacesChange();
      }
    } catch (error) {
      console.error('Failed to update face name:', error);
    }
  };

  const handleDeleteFace = async (faceId: string) => {
    if (!confirm('Are you sure you want to delete this face cluster?')) return;

    try {
      const response = await fetch(`/api/faces/${faceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchFaces();
        onFacesChange();
      }
    } catch (error) {
      console.error('Failed to delete face:', error);
    }
  };

  const handleTriggerDetection = async () => {
    setIsDetecting(true);
    try {
      const response = await fetch('/api/faces/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all' }),
      });

      if (response.ok) {
        await fetchFaces();
        onFacesChange();
      }
    } catch (error) {
      console.error('Failed to trigger face detection:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const getDisplayName = (face: Face) => {
    return face.name || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="border-b pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-20 rounded-full flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (faces.length === 0) {
    return (
      <div className="border-b pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Filter by Face</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleTriggerDetection}
            disabled={isDetecting}
          >
            {isDetecting ? 'Detecting...' : 'Detect Faces'}
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          No faces detected yet. Upload images and click &quot;Detect Faces&quot; to
          start face detection.
        </p>
      </div>
    );
  }

  return (
    <div className="border-b pb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          Filter by Face
          {selectedFaceIds.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedFaceIds.length}
            </Badge>
          )}
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTriggerDetection}
            disabled={isDetecting}
          >
            {isDetecting ? 'Detecting...' : 'Re-detect'}
          </Button>
          <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Manage Faces
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Faces</DialogTitle>
                <DialogDescription>
                  Name faces, merge duplicates, or delete face clusters.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {faces.map((face) => (
                  <div
                    key={face.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={face.thumbnailPath}
                        alt={getDisplayName(face)}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        {editingFace?.id === face.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Enter name"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={handleNameUpdate}
                                className="flex-1"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingFace(null);
                                  setEditName('');
                                }}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h4 className="font-medium truncate">
                              {getDisplayName(face)}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {face.imageCount} photo{face.imageCount !== 1 ? 's' : ''}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingFace(face);
                                  setEditName(face.name || '');
                                }}
                                className="flex-1"
                              >
                                Rename
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteFace(face.id)}
                                className="flex-1 text-red-600 hover:text-red-700"
                              >
                                Delete
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {faces.map((face) => {
          const isSelected = selectedFaceIds.includes(face.id);
          return (
            <button
              key={face.id}
              onClick={() => onFaceSelect(face.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                isSelected
                  ? 'bg-blue-50 ring-2 ring-blue-500'
                  : 'hover:bg-gray-50'
              }`}
              title={getDisplayName(face)}
            >
              <img
                src={face.thumbnailPath}
                alt={getDisplayName(face)}
                className="w-16 h-16 rounded-full object-cover"
              />
              <span className="text-xs font-medium truncate max-w-[64px]">
                {getDisplayName(face)}
              </span>
              <span className="text-xs text-gray-500">{face.imageCount}</span>
            </button>
          );
        })}
      </div>

      {selectedFaceIds.length > 0 && (
        <div className="mt-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => selectedFaceIds.forEach(onFaceSelect)}
            className="text-xs"
          >
            Clear selection
          </Button>
        </div>
      )}
    </div>
  );
};

export default FaceFilterBar;
