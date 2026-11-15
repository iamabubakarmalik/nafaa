-- Live support: chat between shops and the Nafaa team, and markers for the
-- proactive messages (one per shop per message).
-- Additive only: four new tables, no changes to existing tables or rows.

-- CreateTable
CREATE TABLE "live_support_conversations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "openedByUserId" TEXT,
    "subject" TEXT,
    "status" TEXT NOT NULL DEFAULT 'BOT',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assignedAdminId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessagePreview" TEXT,
    "unreadForMerchant" INTEGER NOT NULL DEFAULT 0,
    "unreadForAdmin" INTEGER NOT NULL DEFAULT 0,
    "waitingSince" TIMESTAMP(3),
    "handedOverAt" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "rating" TEXT,
    "ratingNote" TEXT,
    "ratedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'web',
    "botReplies" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "live_support_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_support_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "senderUserId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'TEXT',
    "text" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "meta" JSONB,
    "replyToId" TEXT,
    "clientId" TEXT,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "live_support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_support_canned_replies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" TEXT NOT NULL DEFAULT 'roman',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "live_support_canned_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_support_proactive" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "conversationId" TEXT,
    "messageId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repliedAt" TIMESTAMP(3),
    "lang" TEXT,
    CONSTRAINT "live_support_proactive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_support_conversations_tenantId_lastMessageAt_idx" ON "live_support_conversations"("tenantId", "lastMessageAt");
CREATE INDEX "live_support_conversations_status_lastMessageAt_idx" ON "live_support_conversations"("status", "lastMessageAt");
CREATE INDEX "live_support_conversations_assignedAdminId_status_idx" ON "live_support_conversations"("assignedAdminId", "status");
CREATE INDEX "live_support_conversations_lastMessageAt_idx" ON "live_support_conversations"("lastMessageAt");
CREATE INDEX "live_support_messages_conversationId_createdAt_idx" ON "live_support_messages"("conversationId", "createdAt");
CREATE INDEX "live_support_messages_senderUserId_idx" ON "live_support_messages"("senderUserId");
CREATE INDEX "live_support_canned_replies_title_idx" ON "live_support_canned_replies"("title");
CREATE UNIQUE INDEX "live_support_proactive_tenantId_key_key" ON "live_support_proactive"("tenantId", "key");
CREATE INDEX "live_support_proactive_key_sentAt_idx" ON "live_support_proactive"("key", "sentAt");

-- AddForeignKey
ALTER TABLE "live_support_conversations" ADD CONSTRAINT "live_support_conversations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_support_messages" ADD CONSTRAINT "live_support_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "live_support_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_support_proactive" ADD CONSTRAINT "live_support_proactive_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
