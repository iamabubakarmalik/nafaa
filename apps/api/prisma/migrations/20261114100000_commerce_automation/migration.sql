-- Commerce phase 6: automation rules and their run log. Additive only; new tables, no backfill needed.

CREATE TABLE IF NOT EXISTS "commerce_automation_rules" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "conditions" JSONB NOT NULL DEFAULT '{}',
  "actions" JSONB NOT NULL DEFAULT '[]',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "recipe" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "runCount" INTEGER NOT NULL DEFAULT 0,
  "lastRunAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "commerce_automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "commerce_automation_rules_tenantId_event_enabled_idx" ON "commerce_automation_rules"("tenantId", "event", "enabled");
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_automation_rules_tenantId_recipe_key" ON "commerce_automation_rules"("tenantId", "recipe");

CREATE TABLE IF NOT EXISTS "commerce_automation_runs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "dryRun" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL,
  "depth" INTEGER NOT NULL DEFAULT 0,
  "results" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commerce_automation_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "commerce_automation_runs_tenantId_createdAt_idx" ON "commerce_automation_runs"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "commerce_automation_runs_ruleId_subjectId_event_idx" ON "commerce_automation_runs"("ruleId", "subjectId", "event");
CREATE INDEX IF NOT EXISTS "commerce_automation_runs_tenantId_subjectId_idx" ON "commerce_automation_runs"("tenantId", "subjectId");

DO $$ BEGIN
  ALTER TABLE "commerce_automation_runs" ADD CONSTRAINT "commerce_automation_runs_ruleId_fkey"
    FOREIGN KEY ("ruleId") REFERENCES "commerce_automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
