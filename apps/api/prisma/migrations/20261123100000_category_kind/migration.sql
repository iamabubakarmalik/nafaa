-- Optional industry kind on a shop category. Nullable, so existing rows need no backfill.
ALTER TABLE "Category" ADD COLUMN "kind" TEXT;
