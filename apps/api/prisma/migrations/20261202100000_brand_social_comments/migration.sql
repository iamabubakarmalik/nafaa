-- Nafaa Social: comments inbox. Comments and replies on Nafaa's own published
-- posts, read on a schedule, with a done flag per comment.
-- Additive only: one new table, no changes to existing ones.

-- CreateTable
CREATE TABLE "brand_social_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL DEFAULT '',
    "authorHandle" TEXT,
    "text" TEXT NOT NULL DEFAULT '',
    "permalink" TEXT,
    "commentedAt" TIMESTAMP(3) NOT NULL,
    "mine" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,
    "repliedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "raw" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brand_social_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_social_comments_platform_externalId_key" ON "brand_social_comments"("platform", "externalId");

-- CreateIndex
CREATE INDEX "brand_social_comments_status_commentedAt_idx" ON "brand_social_comments"("status", "commentedAt");

-- CreateIndex
CREATE INDEX "brand_social_comments_postId_idx" ON "brand_social_comments"("postId");

-- AddForeignKey
ALTER TABLE "brand_social_comments" ADD CONSTRAINT "brand_social_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "brand_social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
