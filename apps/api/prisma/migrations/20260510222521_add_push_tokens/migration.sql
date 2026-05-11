-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pushTokens" TEXT[] DEFAULT ARRAY[]::TEXT[];
