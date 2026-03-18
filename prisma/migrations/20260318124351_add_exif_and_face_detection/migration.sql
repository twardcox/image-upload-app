-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "cameraMake" TEXT,
ADD COLUMN     "cameraModel" TEXT,
ADD COLUMN     "dateTaken" TIMESTAMP(3),
ADD COLUMN     "exposureTime" TEXT,
ADD COLUMN     "fNumber" DOUBLE PRECISION,
ADD COLUMN     "focalLength" DOUBLE PRECISION,
ADD COLUMN     "gpsLatitude" DOUBLE PRECISION,
ADD COLUMN     "gpsLongitude" DOUBLE PRECISION,
ADD COLUMN     "iso" INTEGER;

-- CreateTable
CREATE TABLE "Face" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "faceDescriptor" JSONB NOT NULL,
    "thumbnailPath" TEXT NOT NULL,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Face_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageFace" (
    "imageId" TEXT NOT NULL,
    "faceId" TEXT NOT NULL,
    "boundingBox" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ImageFace_pkey" PRIMARY KEY ("imageId","faceId")
);

-- CreateIndex
CREATE INDEX "Face_name_idx" ON "Face"("name");

-- CreateIndex
CREATE INDEX "ImageFace_imageId_idx" ON "ImageFace"("imageId");

-- CreateIndex
CREATE INDEX "ImageFace_faceId_idx" ON "ImageFace"("faceId");

-- CreateIndex
CREATE INDEX "Image_dateTaken_idx" ON "Image"("dateTaken");

-- CreateIndex
CREATE INDEX "Image_gpsLatitude_gpsLongitude_idx" ON "Image"("gpsLatitude", "gpsLongitude");

-- AddForeignKey
ALTER TABLE "ImageFace" ADD CONSTRAINT "ImageFace_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageFace" ADD CONSTRAINT "ImageFace_faceId_fkey" FOREIGN KEY ("faceId") REFERENCES "Face"("id") ON DELETE CASCADE ON UPDATE CASCADE;
