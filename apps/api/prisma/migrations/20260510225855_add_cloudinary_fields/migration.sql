-- AlterTable
ALTER TABLE "Upload" ADD COLUMN     "publicId" TEXT,
ADD COLUMN     "storage" TEXT NOT NULL DEFAULT 'local';
