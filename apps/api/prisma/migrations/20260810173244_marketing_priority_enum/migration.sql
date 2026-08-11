/*
  Warnings:

  - The `priority` column on the `ContactFormSubmission` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ContactFormPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "ContactFormSubmission" DROP COLUMN "priority",
ADD COLUMN     "priority" "ContactFormPriority" NOT NULL DEFAULT 'NORMAL';
