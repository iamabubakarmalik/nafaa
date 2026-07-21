-- AlterTable
ALTER TABLE "OnboardingProgress" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'PKR',
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "detectedCity" TEXT,
ADD COLUMN     "detectedCountry" TEXT,
ADD COLUMN     "detectedIp" TEXT,
ADD COLUMN     "detectedProvince" TEXT,
ADD COLUMN     "detectedTimezone" TEXT,
ADD COLUMN     "enableTax" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enabledFeatures" JSONB,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "shopArea" TEXT,
ADD COLUMN     "shopLandmark" TEXT,
ADD COLUMN     "signupSource" TEXT,
ADD COLUMN     "skipCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "smartDefaults" JSONB,
ADD COLUMN     "subscribedToTips" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usedSampleData" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wantsSampleData" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "OnboardingProgress_isCompleted_idx" ON "OnboardingProgress"("isCompleted");
