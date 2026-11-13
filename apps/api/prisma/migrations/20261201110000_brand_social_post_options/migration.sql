-- Nafaa Social: per-post platform options (TikTok privacy, interactions and
-- content disclosure for direct posts). Additive and nullable; existing rows
-- keep NULL, which reads as "no options chosen".

-- AlterTable
ALTER TABLE "brand_social_posts" ADD COLUMN "options" JSONB;
