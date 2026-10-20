-- Marketing CMS: content for the new public site (apps/site), edited in apps/admin.
--
-- 1. CmsEntry: every page of the site (industries, cities, posts, glossary
--    terms, people, docs, ...). Columns hold the draft; `published` holds the
--    live snapshot.
-- 2. CmsRevision: history of entries, menus, settings and FAQs.
-- 3. CmsEntryRelation, CmsEntryFaq: published index of tags, related links
--    and FAQ placement, rebuilt on publish.
-- 4. CmsFaq: reusable questions and answers.
-- 5. CmsMedia: media library (Cloudinary), alt text required.
-- 6. CmsRedirect: 301 / 302 / 410 rules.
-- 7. CmsMenu, CmsSetting: navigation, site settings and entity facts.
-- 8. CmsCustomer, CmsTestimonial: real customers with recorded consent.
--
-- Additive only: new enums and new tables, no change to existing tables.
-- Tables start empty; content comes from the seed script.
-- Safe to run more than once.

-- ─── Enums ────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "CmsEntryType" AS ENUM (
    'PAGE', 'PRODUCT', 'INDUSTRY', 'SOLUTION', 'SERVICE', 'INTEGRATION', 'COMPLIANCE',
    'CITY', 'CITY_INDUSTRY', 'BEST_OF', 'COMPARE', 'ALTERNATIVE', 'BLOG_POST',
    'BLOG_CATEGORY', 'GUIDE', 'GLOSSARY_TERM', 'TOOL', 'TEMPLATE', 'CASE_STUDY',
    'PERSON', 'DOC', 'CHANGELOG'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CmsStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CmsRelationKind" AS ENUM ('TAG', 'RELATED', 'MENTIONS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CmsMediaKind" AS ENUM ('IMAGE', 'SCREENSHOT', 'LOGO', 'ILLUSTRATION', 'VIDEO', 'DOCUMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CmsRedirectSource" AS ENUM ('MANUAL', 'SLUG_CHANGE', 'UNPUBLISH', 'IMPORT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Media ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CmsMedia" (
  "id" TEXT NOT NULL,
  "kind" "CmsMediaKind" NOT NULL DEFAULT 'IMAGE',
  "provider" TEXT NOT NULL DEFAULT 'cloudinary',
  "publicId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "durationSec" INTEGER,
  "alt" TEXT NOT NULL,
  "altTranslations" JSONB,
  "caption" TEXT,
  "credit" TEXT,
  "sourceUrl" TEXT,
  "blurDataUrl" TEXT,
  "dominantColor" TEXT,
  "focalX" DOUBLE PRECISION,
  "focalY" DOUBLE PRECISION,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "folder" TEXT,
  "checksum" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "CmsMedia_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CmsMedia_publicId_key" ON "CmsMedia"("publicId");
CREATE INDEX IF NOT EXISTS "CmsMedia_kind_idx" ON "CmsMedia"("kind");
CREATE INDEX IF NOT EXISTS "CmsMedia_checksum_idx" ON "CmsMedia"("checksum");
CREATE INDEX IF NOT EXISTS "CmsMedia_createdAt_idx" ON "CmsMedia"("createdAt");

-- ─── Entries ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CmsEntry" (
  "id" TEXT NOT NULL,
  "type" "CmsEntryType" NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "translationKey" TEXT,
  "slug" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "parentId" TEXT,
  "status" "CmsStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "blocks" JSONB NOT NULL DEFAULT '[]',
  "data" JSONB NOT NULL DEFAULT '{}',
  "relations" JSONB NOT NULL DEFAULT '[]',
  "faqIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "imageId" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "focusKeyword" TEXT,
  "canonicalUrl" TEXT,
  "noindex" BOOLEAN NOT NULL DEFAULT false,
  "nofollow" BOOLEAN NOT NULL DEFAULT false,
  "ogImageId" TEXT,
  "schemaExtra" JSONB,
  "seoScore" INTEGER,
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "authorId" TEXT,
  "reviewerId" TEXT,
  "factCheckedAt" TIMESTAMP(3),
  "factCheckedById" TEXT,
  "published" JSONB,
  "publishedPath" TEXT,
  "publishedRevisionId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "firstPublishedAt" TIMESTAMP(3),
  "contentUpdatedAt" TIMESTAMP(3),
  "publishAt" TIMESTAMP(3),
  "scheduledRevisionId" TEXT,
  "hasUnpublishedChanges" BOOLEAN NOT NULL DEFAULT false,
  "publishedById" TEXT,
  "archivedAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CmsEntry_locale_path_key" ON "CmsEntry"("locale", "path");
CREATE UNIQUE INDEX IF NOT EXISTS "CmsEntry_locale_publishedPath_key" ON "CmsEntry"("locale", "publishedPath");
CREATE INDEX IF NOT EXISTS "CmsEntry_type_locale_status_idx" ON "CmsEntry"("type", "locale", "status");
CREATE INDEX IF NOT EXISTS "CmsEntry_status_publishAt_idx" ON "CmsEntry"("status", "publishAt");
CREATE INDEX IF NOT EXISTS "CmsEntry_parentId_idx" ON "CmsEntry"("parentId");
CREATE INDEX IF NOT EXISTS "CmsEntry_authorId_idx" ON "CmsEntry"("authorId");
CREATE INDEX IF NOT EXISTS "CmsEntry_reviewerId_idx" ON "CmsEntry"("reviewerId");
CREATE INDEX IF NOT EXISTS "CmsEntry_translationKey_idx" ON "CmsEntry"("translationKey");
CREATE INDEX IF NOT EXISTS "CmsEntry_updatedAt_idx" ON "CmsEntry"("updatedAt");

DO $$ BEGIN
  ALTER TABLE "CmsEntry" ADD CONSTRAINT "CmsEntry_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "CmsEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CmsEntry" ADD CONSTRAINT "CmsEntry_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "CmsEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CmsEntry" ADD CONSTRAINT "CmsEntry_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "CmsEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CmsEntry" ADD CONSTRAINT "CmsEntry_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "CmsMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CmsEntry" ADD CONSTRAINT "CmsEntry_ogImageId_fkey"
    FOREIGN KEY ("ogImageId") REFERENCES "CmsMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Revisions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CmsRevision" (
  "id" TEXT NOT NULL,
  "entryId" TEXT,
  "subject" TEXT NOT NULL DEFAULT 'ENTRY',
  "subjectKey" TEXT,
  "version" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revalidatedAt" TIMESTAMP(3),
  "revalidateError" TEXT,
  CONSTRAINT "CmsRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CmsRevision_entryId_version_key" ON "CmsRevision"("entryId", "version");
CREATE INDEX IF NOT EXISTS "CmsRevision_entryId_createdAt_idx" ON "CmsRevision"("entryId", "createdAt");
CREATE INDEX IF NOT EXISTS "CmsRevision_subject_subjectKey_createdAt_idx" ON "CmsRevision"("subject", "subjectKey", "createdAt");

DO $$ BEGIN
  ALTER TABLE "CmsRevision" ADD CONSTRAINT "CmsRevision_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "CmsEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Entry relations (published index) ────────────────────────────────

CREATE TABLE IF NOT EXISTS "CmsEntryRelation" (
  "id" TEXT NOT NULL,
  "fromId" TEXT NOT NULL,
  "toId" TEXT NOT NULL,
  "kind" "CmsRelationKind" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CmsEntryRelation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CmsEntryRelation_fromId_toId_kind_key" ON "CmsEntryRelation"("fromId", "toId", "kind");
CREATE INDEX IF NOT EXISTS "CmsEntryRelation_toId_kind_idx" ON "CmsEntryRelation"("toId", "kind");

DO $$ BEGIN
  ALTER TABLE "CmsEntryRelation" ADD CONSTRAINT "CmsEntryRelation_fromId_fkey"
    FOREIGN KEY ("fromId") REFERENCES "CmsEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CmsEntryRelation" ADD CONSTRAINT "CmsEntryRelation_toId_fkey"
    FOREIGN KEY ("toId") REFERENCES "CmsEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── FAQs ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CmsFaq" (
  "id" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "translationKey" TEXT,
  "topic" TEXT,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "status" "CmsStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedQuestion" TEXT,
  "publishedAnswer" TEXT,
  "publishedAt" TIMESTAMP(3),
  "hasUnpublishedChanges" BOOLEAN NOT NULL DEFAULT false,
  "sourceNote" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsFaq_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CmsFaq_locale_status_idx" ON "CmsFaq"("locale", "status");
CREATE INDEX IF NOT EXISTS "CmsFaq_topic_idx" ON "CmsFaq"("topic");
CREATE INDEX IF NOT EXISTS "CmsFaq_translationKey_idx" ON "CmsFaq"("translationKey");

CREATE TABLE IF NOT EXISTS "CmsEntryFaq" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "faqId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CmsEntryFaq_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CmsEntryFaq_entryId_faqId_key" ON "CmsEntryFaq"("entryId", "faqId");
CREATE INDEX IF NOT EXISTS "CmsEntryFaq_faqId_idx" ON "CmsEntryFaq"("faqId");

DO $$ BEGIN
  ALTER TABLE "CmsEntryFaq" ADD CONSTRAINT "CmsEntryFaq_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "CmsEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CmsEntryFaq" ADD CONSTRAINT "CmsEntryFaq_faqId_fkey"
    FOREIGN KEY ("faqId") REFERENCES "CmsFaq"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Redirects ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CmsRedirect" (
  "id" TEXT NOT NULL,
  "fromPath" TEXT NOT NULL,
  "toPath" TEXT,
  "statusCode" INTEGER NOT NULL DEFAULT 301,
  "isPattern" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "source" "CmsRedirectSource" NOT NULL DEFAULT 'MANUAL',
  "entryId" TEXT,
  "hits" INTEGER NOT NULL DEFAULT 0,
  "lastHitAt" TIMESTAMP(3),
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsRedirect_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CmsRedirect_fromPath_key" ON "CmsRedirect"("fromPath");
CREATE INDEX IF NOT EXISTS "CmsRedirect_isActive_isPattern_idx" ON "CmsRedirect"("isActive", "isPattern");
CREATE INDEX IF NOT EXISTS "CmsRedirect_entryId_idx" ON "CmsRedirect"("entryId");
CREATE INDEX IF NOT EXISTS "CmsRedirect_toPath_idx" ON "CmsRedirect"("toPath");

DO $$ BEGIN
  ALTER TABLE "CmsRedirect" ADD CONSTRAINT "CmsRedirect_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "CmsEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Menus and settings ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CmsMenu" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "title" TEXT NOT NULL,
  "items" JSONB NOT NULL DEFAULT '[]',
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsMenu_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CmsMenu_key_locale_key" ON "CmsMenu"("key", "locale");

CREATE TABLE IF NOT EXISTS "CmsSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "value" JSONB NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CmsSetting_key_locale_key" ON "CmsSetting"("key", "locale");

-- ─── Customers and testimonials ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CmsCustomer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "logoId" TEXT,
  "cityEntryId" TEXT,
  "industryEntryId" TEXT,
  "website" TEXT,
  "tenantId" TEXT,
  "consentScope" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "consentAt" TIMESTAMP(3),
  "consentEvidence" TEXT,
  "verifiedById" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsCustomer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CmsCustomer_slug_key" ON "CmsCustomer"("slug");
CREATE INDEX IF NOT EXISTS "CmsCustomer_isPublic_idx" ON "CmsCustomer"("isPublic");
CREATE INDEX IF NOT EXISTS "CmsCustomer_cityEntryId_idx" ON "CmsCustomer"("cityEntryId");
CREATE INDEX IF NOT EXISTS "CmsCustomer_industryEntryId_idx" ON "CmsCustomer"("industryEntryId");
CREATE INDEX IF NOT EXISTS "CmsCustomer_tenantId_idx" ON "CmsCustomer"("tenantId");

DO $$ BEGIN
  ALTER TABLE "CmsCustomer" ADD CONSTRAINT "CmsCustomer_logoId_fkey"
    FOREIGN KEY ("logoId") REFERENCES "CmsMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CmsCustomer" ADD CONSTRAINT "CmsCustomer_cityEntryId_fkey"
    FOREIGN KEY ("cityEntryId") REFERENCES "CmsEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CmsCustomer" ADD CONSTRAINT "CmsCustomer_industryEntryId_fkey"
    FOREIGN KEY ("industryEntryId") REFERENCES "CmsEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CmsTestimonial" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "personName" TEXT NOT NULL,
  "personRole" TEXT,
  "quote" TEXT NOT NULL,
  "photoId" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'DIRECT',
  "sourceUrl" TEXT,
  "collectedAt" TIMESTAMP(3),
  "status" "CmsStatus" NOT NULL DEFAULT 'DRAFT',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsTestimonial_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CmsTestimonial_customerId_idx" ON "CmsTestimonial"("customerId");
CREATE INDEX IF NOT EXISTS "CmsTestimonial_status_idx" ON "CmsTestimonial"("status");

DO $$ BEGIN
  ALTER TABLE "CmsTestimonial" ADD CONSTRAINT "CmsTestimonial_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "CmsCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CmsTestimonial" ADD CONSTRAINT "CmsTestimonial_photoId_fkey"
    FOREIGN KEY ("photoId") REFERENCES "CmsMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
