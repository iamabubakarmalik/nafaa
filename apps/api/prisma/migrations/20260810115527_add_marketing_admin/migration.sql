-- CreateEnum
CREATE TYPE "MarketingLeadSource" AS ENUM ('NEWSLETTER', 'CONTACT_FORM', 'DEMO_REQUEST', 'BLOG_SIGNUP', 'CHATBOT', 'REFERRAL', 'ORGANIC_SEARCH', 'PAID_ADS', 'SOCIAL_MEDIA', 'DIRECT', 'EMAIL_CAMPAIGN', 'AFFILIATE', 'OTHER');

-- CreateEnum
CREATE TYPE "MarketingLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'PROPOSAL_SENT', 'NEGOTIATING', 'CONVERTED', 'LOST', 'UNRESPONSIVE', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "MarketingLeadTemperature" AS ENUM ('COLD', 'WARM', 'HOT', 'FIRE');

-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'PENDING_CONFIRMATION');

-- CreateEnum
CREATE TYPE "ContactFormType" AS ENUM ('GENERAL', 'SALES', 'SUPPORT', 'PARTNERSHIP', 'MEDIA', 'CAREER', 'DEMO_REQUEST', 'ENTERPRISE', 'BUG_REPORT', 'FEATURE_REQUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactFormStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'REPLIED', 'RESOLVED', 'SPAM', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DemoBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChatbotConversationStatus" AS ENUM ('ACTIVE', 'BOT_HANDLING', 'WAITING_HUMAN', 'HUMAN_HANDLING', 'RESOLVED', 'ABANDONED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChatMessageSenderType" AS ENUM ('USER', 'BOT', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'ANNOUNCEMENT', 'RETARGETING');

-- CreateEnum
CREATE TYPE "CampaignStatusMkt" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "SeoPageStatus" AS ENUM ('INDEXED', 'NOT_INDEXED', 'BLOCKED', 'ERROR', 'PENDING');

-- CreateEnum
CREATE TYPE "AbTestStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "status" "NewsletterStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "MarketingLeadSource" NOT NULL DEFAULT 'NEWSLETTER',
    "sourceUrl" TEXT,
    "sourcePage" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "industry" TEXT,
    "role" TEXT,
    "companyName" TEXT,
    "companySize" TEXT,
    "country" TEXT DEFAULT 'Pakistan',
    "city" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationToken" TEXT,
    "totalEmailsSent" INTEGER NOT NULL DEFAULT 0,
    "totalOpened" INTEGER NOT NULL DEFAULT 0,
    "totalClicked" INTEGER NOT NULL DEFAULT 0,
    "lastEmailAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "lastClickedAt" TIMESTAMP(3),
    "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unsubscribedAt" TIMESTAMP(3),
    "unsubscribeReason" TEXT,
    "bouncedAt" TIMESTAMP(3),
    "bounceReason" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "segments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterEmailLog" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "campaignId" TEXT,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "clickedLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bouncedAt" TIMESTAMP(3),
    "complainedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactFormSubmission" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT,
    "designation" TEXT,
    "country" TEXT DEFAULT 'Pakistan',
    "city" TEXT,
    "formType" "ContactFormType" NOT NULL DEFAULT 'GENERAL',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceUrl" TEXT,
    "sourcePage" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "status" "ContactFormStatus" NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "responseTimeMin" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "resolutionTimeMin" INTEGER,
    "repliesCount" INTEGER NOT NULL DEFAULT 0,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "spamScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spamReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "internalNotes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "convertedToLead" BOOLEAN NOT NULL DEFAULT false,
    "leadId" TEXT,
    "convertedToTenant" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactFormReply" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT,
    "senderName" TEXT,
    "message" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactFormReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoBooking" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "companyName" TEXT,
    "designation" TEXT,
    "industry" TEXT,
    "companySize" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Pakistan',
    "numberOfShops" INTEGER,
    "currentSoftware" TEXT,
    "painPoints" TEXT,
    "interestedIn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budget" TEXT,
    "timeline" TEXT,
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "preferredTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "duration" INTEGER NOT NULL DEFAULT 30,
    "meetingType" TEXT NOT NULL DEFAULT 'VIDEO_CALL',
    "meetingLink" TEXT,
    "calendarEventId" TEXT,
    "status" "DemoBookingStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "assignedName" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "rescheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "noShowAt" TIMESTAMP(3),
    "rating" INTEGER,
    "feedback" TEXT,
    "interestLevel" TEXT,
    "followUpScheduled" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "followUpNotes" TEXT,
    "recordingUrl" TEXT,
    "transcriptUrl" TEXT,
    "sourceUrl" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "convertedToLead" BOOLEAN NOT NULL DEFAULT false,
    "leadId" TEXT,
    "convertedToTenant" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT,
    "conversionValue" DOUBLE PRECISION,
    "reminderSent24h" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent1h" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "internalNotes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingLead" (
    "id" TEXT NOT NULL,
    "leadNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "companyName" TEXT,
    "designation" TEXT,
    "industry" TEXT,
    "companySize" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Pakistan',
    "linkedinUrl" TEXT,
    "facebookUrl" TEXT,
    "source" "MarketingLeadSource" NOT NULL,
    "sourceDetail" TEXT,
    "status" "MarketingLeadStatus" NOT NULL DEFAULT 'NEW',
    "temperature" "MarketingLeadTemperature" NOT NULL DEFAULT 'COLD',
    "score" INTEGER NOT NULL DEFAULT 0,
    "assignedTo" TEXT,
    "assignedName" TEXT,
    "assignedAt" TIMESTAMP(3),
    "originType" TEXT,
    "originId" TEXT,
    "originUrl" TEXT,
    "landingPage" TEXT,
    "referrerUrl" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "interestedInPlan" TEXT,
    "interestedFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budget" TEXT,
    "timeline" TEXT,
    "decisionMaker" BOOLEAN NOT NULL DEFAULT false,
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "emailsOpened" INTEGER NOT NULL DEFAULT 0,
    "callsMade" INTEGER NOT NULL DEFAULT 0,
    "meetingsHeld" INTEGER NOT NULL DEFAULT 0,
    "demosScheduled" INTEGER NOT NULL DEFAULT 0,
    "demosAttended" INTEGER NOT NULL DEFAULT 0,
    "firstContactAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "convertedToTenant" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT,
    "conversionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lostReason" TEXT,
    "lostAt" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalNotes" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "performedBy" TEXT,
    "performedByName" TEXT,
    "outcome" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotConversation" (
    "id" TEXT NOT NULL,
    "conversationNumber" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "visitorName" TEXT,
    "visitorEmail" TEXT,
    "visitorPhone" TEXT,
    "visitorCompany" TEXT,
    "visitorCountry" TEXT,
    "visitorCity" TEXT,
    "status" "ChatbotConversationStatus" NOT NULL DEFAULT 'BOT_HANDLING',
    "isBot" BOOLEAN NOT NULL DEFAULT true,
    "currentAgentId" TEXT,
    "currentAgentName" TEXT,
    "currentPage" TEXT,
    "referrerUrl" TEXT,
    "visitorTimezone" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "botMessageCount" INTEGER NOT NULL DEFAULT 0,
    "userMessageCount" INTEGER NOT NULL DEFAULT 0,
    "agentMessageCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstAgentResponseAt" TIMESTAMP(3),
    "responseTimeSec" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER,
    "feedback" TEXT,
    "wasResolved" BOOLEAN,
    "detectedIntent" TEXT,
    "intentConfidence" DOUBLE PRECISION,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "convertedToLead" BOOLEAN NOT NULL DEFAULT false,
    "leadId" TEXT,
    "convertedToDemo" BOOLEAN NOT NULL DEFAULT false,
    "demoBookingId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" "ChatMessageSenderType" NOT NULL,
    "senderName" TEXT,
    "senderAvatar" TEXT,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'TEXT',
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "intent" TEXT,
    "confidence" DOUBLE PRECISION,
    "botResponseTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotIntent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trainingPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "response" TEXT NOT NULL,
    "responseType" TEXT NOT NULL DEFAULT 'TEXT',
    "quickReplies" JSONB,
    "suggestedActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresHuman" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotAgent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "maxConcurrentChats" INTEGER NOT NULL DEFAULT 5,
    "currentActiveChats" INTEGER NOT NULL DEFAULT 0,
    "totalChatsHandled" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTimeSec" INTEGER,
    "avgRating" DOUBLE PRECISION,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "workingHoursStart" TEXT,
    "workingHoursEnd" TEXT,
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY['en', 'ur']::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastOnlineAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "campaignNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "CampaignType" NOT NULL,
    "status" "CampaignStatusMkt" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT,
    "previewText" TEXT,
    "bodyHtml" TEXT,
    "bodyText" TEXT,
    "smsMessage" TEXT,
    "whatsappMessage" TEXT,
    "templateId" TEXT,
    "targetSegment" TEXT,
    "targetFilters" JSONB,
    "targetTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimatedReach" INTEGER NOT NULL DEFAULT 0,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "replyTo" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalDelivered" INTEGER NOT NULL DEFAULT 0,
    "totalOpened" INTEGER NOT NULL DEFAULT 0,
    "totalClicked" INTEGER NOT NULL DEFAULT 0,
    "totalBounced" INTEGER NOT NULL DEFAULT 0,
    "totalUnsubscribed" INTEGER NOT NULL DEFAULT 0,
    "totalComplained" INTEGER NOT NULL DEFAULT 0,
    "openRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clickRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bounceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unsubscribeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "conversionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roi" DOUBLE PRECISION,
    "isAbTest" BOOLEAN NOT NULL DEFAULT false,
    "abTestId" TEXT,
    "variant" TEXT,
    "createdById" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingPageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "fullUrl" TEXT,
    "title" TEXT,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "isNewVisitor" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "referrer" TEXT,
    "referrerDomain" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "timeOnPageSec" INTEGER,
    "scrollDepthPct" INTEGER,
    "bounced" BOOLEAN NOT NULL DEFAULT false,
    "exited" BOOLEAN NOT NULL DEFAULT false,
    "hasInteracted" BOOLEAN NOT NULL DEFAULT false,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    "country" TEXT,
    "city" TEXT,
    "ipAddress" TEXT,
    "ipCountry" TEXT,
    "language" TEXT,
    "loadTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingPageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "landingPage" TEXT NOT NULL,
    "entryReferrer" TEXT,
    "entryUtmSource" TEXT,
    "entryUtmMedium" TEXT,
    "entryUtmCampaign" TEXT,
    "exitPage" TEXT,
    "exitAt" TIMESTAMP(3),
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "bounced" BOOLEAN NOT NULL DEFAULT true,
    "hadConversion" BOOLEAN NOT NULL DEFAULT false,
    "conversionType" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "city" TEXT,
    "ipAddress" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingEvent" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventCategory" TEXT,
    "eventLabel" TEXT,
    "eventValue" DOUBLE PRECISION,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "path" TEXT,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoPage" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "canonicalUrl" TEXT,
    "status" "SeoPageStatus" NOT NULL DEFAULT 'INDEXED',
    "totalImpressions" INTEGER NOT NULL DEFAULT 0,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "avgCtr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgPosition" DOUBLE PRECISION,
    "lastCheckedAt" TIMESTAMP(3),
    "wordCount" INTEGER,
    "readingTimeMin" INTEGER,
    "contentType" TEXT,
    "hasStructuredData" BOOLEAN NOT NULL DEFAULT false,
    "hasOgImage" BOOLEAN NOT NULL DEFAULT false,
    "hasCanonical" BOOLEAN NOT NULL DEFAULT false,
    "mobileScore" INTEGER,
    "desktopScore" INTEGER,
    "lastCrawledAt" TIMESTAMP(3),
    "language" TEXT NOT NULL DEFAULT 'en',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoKeyword" (
    "id" TEXT NOT NULL,
    "pageId" TEXT,
    "keyword" TEXT NOT NULL,
    "searchVolume" INTEGER,
    "difficulty" INTEGER,
    "currentPosition" INTEGER,
    "previousPosition" INTEGER,
    "bestPosition" INTEGER,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isTracking" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT NOT NULL DEFAULT 'PK',
    "device" TEXT NOT NULL DEFAULT 'BOTH',
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbTest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "AbTestStatus" NOT NULL DEFAULT 'DRAFT',
    "targetPage" TEXT,
    "targetElement" TEXT,
    "goalMetric" TEXT NOT NULL,
    "goalValue" TEXT,
    "variants" JSONB NOT NULL,
    "trafficPct" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationDays" INTEGER,
    "totalVisitors" INTEGER NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "winningVariant" TEXT,
    "confidenceLevel" DOUBLE PRECISION,
    "results" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeatmapSession" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "deviceType" TEXT,
    "clicks" JSONB,
    "scrollDepth" INTEGER,
    "moves" JSONB,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeatmapSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionFunnel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "steps" JSONB NOT NULL,
    "goalValue" DOUBLE PRECISION,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "totalCompleted" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversionFunnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MARKETING_MANAGER',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedById" TEXT,
    "invitedAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingIntegration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "credentials" JSONB,
    "config" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPostAnalytics" (
    "id" TEXT NOT NULL,
    "postSlug" TEXT NOT NULL,
    "postTitle" TEXT NOT NULL,
    "category" TEXT,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueViews" INTEGER NOT NULL DEFAULT 0,
    "avgTimeOnPage" INTEGER,
    "bounceRate" DOUBLE PRECISION,
    "scrollDepthAvg" DOUBLE PRECISION,
    "totalShares" INTEGER NOT NULL DEFAULT 0,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "emailSignups" INTEGER NOT NULL DEFAULT 0,
    "ctaClicks" INTEGER NOT NULL DEFAULT 0,
    "organicClicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "avgPosition" DOUBLE PRECISION,
    "viewsLast7d" INTEGER NOT NULL DEFAULT 0,
    "viewsLast30d" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPostAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_verificationToken_key" ON "NewsletterSubscriber"("verificationToken");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_idx" ON "NewsletterSubscriber"("status");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_email_idx" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_source_idx" ON "NewsletterSubscriber"("source");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_createdAt_idx" ON "NewsletterSubscriber"("createdAt");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_engagementScore_idx" ON "NewsletterSubscriber"("engagementScore");

-- CreateIndex
CREATE INDEX "NewsletterEmailLog_subscriberId_idx" ON "NewsletterEmailLog"("subscriberId");

-- CreateIndex
CREATE INDEX "NewsletterEmailLog_campaignId_idx" ON "NewsletterEmailLog"("campaignId");

-- CreateIndex
CREATE INDEX "NewsletterEmailLog_sentAt_idx" ON "NewsletterEmailLog"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContactFormSubmission_ticketNumber_key" ON "ContactFormSubmission"("ticketNumber");

-- CreateIndex
CREATE INDEX "ContactFormSubmission_status_idx" ON "ContactFormSubmission"("status");

-- CreateIndex
CREATE INDEX "ContactFormSubmission_email_idx" ON "ContactFormSubmission"("email");

-- CreateIndex
CREATE INDEX "ContactFormSubmission_formType_idx" ON "ContactFormSubmission"("formType");

-- CreateIndex
CREATE INDEX "ContactFormSubmission_createdAt_idx" ON "ContactFormSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "ContactFormSubmission_assignedTo_idx" ON "ContactFormSubmission"("assignedTo");

-- CreateIndex
CREATE INDEX "ContactFormReply_submissionId_idx" ON "ContactFormReply"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoBooking_bookingNumber_key" ON "DemoBooking"("bookingNumber");

-- CreateIndex
CREATE INDEX "DemoBooking_status_idx" ON "DemoBooking"("status");

-- CreateIndex
CREATE INDEX "DemoBooking_email_idx" ON "DemoBooking"("email");

-- CreateIndex
CREATE INDEX "DemoBooking_preferredDate_idx" ON "DemoBooking"("preferredDate");

-- CreateIndex
CREATE INDEX "DemoBooking_assignedTo_idx" ON "DemoBooking"("assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingLead_leadNumber_key" ON "MarketingLead"("leadNumber");

-- CreateIndex
CREATE INDEX "MarketingLead_status_idx" ON "MarketingLead"("status");

-- CreateIndex
CREATE INDEX "MarketingLead_source_idx" ON "MarketingLead"("source");

-- CreateIndex
CREATE INDEX "MarketingLead_temperature_idx" ON "MarketingLead"("temperature");

-- CreateIndex
CREATE INDEX "MarketingLead_email_idx" ON "MarketingLead"("email");

-- CreateIndex
CREATE INDEX "MarketingLead_phone_idx" ON "MarketingLead"("phone");

-- CreateIndex
CREATE INDEX "MarketingLead_assignedTo_idx" ON "MarketingLead"("assignedTo");

-- CreateIndex
CREATE INDEX "MarketingLead_createdAt_idx" ON "MarketingLead"("createdAt");

-- CreateIndex
CREATE INDEX "MarketingLead_score_idx" ON "MarketingLead"("score");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");

-- CreateIndex
CREATE INDEX "LeadActivity_activityType_idx" ON "LeadActivity"("activityType");

-- CreateIndex
CREATE INDEX "LeadActivity_createdAt_idx" ON "LeadActivity"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotConversation_conversationNumber_key" ON "ChatbotConversation"("conversationNumber");

-- CreateIndex
CREATE INDEX "ChatbotConversation_status_idx" ON "ChatbotConversation"("status");

-- CreateIndex
CREATE INDEX "ChatbotConversation_visitorId_idx" ON "ChatbotConversation"("visitorId");

-- CreateIndex
CREATE INDEX "ChatbotConversation_currentAgentId_idx" ON "ChatbotConversation"("currentAgentId");

-- CreateIndex
CREATE INDEX "ChatbotConversation_startedAt_idx" ON "ChatbotConversation"("startedAt");

-- CreateIndex
CREATE INDEX "ChatbotConversation_lastActivityAt_idx" ON "ChatbotConversation"("lastActivityAt");

-- CreateIndex
CREATE INDEX "ChatbotMessage_conversationId_idx" ON "ChatbotMessage"("conversationId");

-- CreateIndex
CREATE INDEX "ChatbotMessage_senderType_idx" ON "ChatbotMessage"("senderType");

-- CreateIndex
CREATE INDEX "ChatbotMessage_createdAt_idx" ON "ChatbotMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotIntent_name_key" ON "ChatbotIntent"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotIntent_slug_key" ON "ChatbotIntent"("slug");

-- CreateIndex
CREATE INDEX "ChatbotIntent_slug_idx" ON "ChatbotIntent"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotAgent_userId_key" ON "ChatbotAgent"("userId");

-- CreateIndex
CREATE INDEX "ChatbotAgent_status_idx" ON "ChatbotAgent"("status");

-- CreateIndex
CREATE INDEX "ChatbotAgent_isActive_idx" ON "ChatbotAgent"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingCampaign_campaignNumber_key" ON "MarketingCampaign"("campaignNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingCampaign_slug_key" ON "MarketingCampaign"("slug");

-- CreateIndex
CREATE INDEX "MarketingCampaign_status_idx" ON "MarketingCampaign"("status");

-- CreateIndex
CREATE INDEX "MarketingCampaign_type_idx" ON "MarketingCampaign"("type");

-- CreateIndex
CREATE INDEX "MarketingCampaign_scheduledAt_idx" ON "MarketingCampaign"("scheduledAt");

-- CreateIndex
CREATE INDEX "MarketingCampaign_createdAt_idx" ON "MarketingCampaign"("createdAt");

-- CreateIndex
CREATE INDEX "MarketingPageView_path_idx" ON "MarketingPageView"("path");

-- CreateIndex
CREATE INDEX "MarketingPageView_visitorId_idx" ON "MarketingPageView"("visitorId");

-- CreateIndex
CREATE INDEX "MarketingPageView_sessionId_idx" ON "MarketingPageView"("sessionId");

-- CreateIndex
CREATE INDEX "MarketingPageView_createdAt_idx" ON "MarketingPageView"("createdAt");

-- CreateIndex
CREATE INDEX "MarketingPageView_utmSource_utmCampaign_idx" ON "MarketingPageView"("utmSource", "utmCampaign");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingSession_sessionId_key" ON "MarketingSession"("sessionId");

-- CreateIndex
CREATE INDEX "MarketingSession_visitorId_idx" ON "MarketingSession"("visitorId");

-- CreateIndex
CREATE INDEX "MarketingSession_startedAt_idx" ON "MarketingSession"("startedAt");

-- CreateIndex
CREATE INDEX "MarketingSession_landingPage_idx" ON "MarketingSession"("landingPage");

-- CreateIndex
CREATE INDEX "MarketingEvent_eventName_idx" ON "MarketingEvent"("eventName");

-- CreateIndex
CREATE INDEX "MarketingEvent_visitorId_idx" ON "MarketingEvent"("visitorId");

-- CreateIndex
CREATE INDEX "MarketingEvent_createdAt_idx" ON "MarketingEvent"("createdAt");

-- CreateIndex
CREATE INDEX "MarketingEvent_eventCategory_idx" ON "MarketingEvent"("eventCategory");

-- CreateIndex
CREATE UNIQUE INDEX "SeoPage_path_key" ON "SeoPage"("path");

-- CreateIndex
CREATE INDEX "SeoPage_status_idx" ON "SeoPage"("status");

-- CreateIndex
CREATE INDEX "SeoPage_totalClicks_idx" ON "SeoPage"("totalClicks");

-- CreateIndex
CREATE INDEX "SeoKeyword_pageId_idx" ON "SeoKeyword"("pageId");

-- CreateIndex
CREATE INDEX "SeoKeyword_currentPosition_idx" ON "SeoKeyword"("currentPosition");

-- CreateIndex
CREATE UNIQUE INDEX "SeoKeyword_keyword_country_device_key" ON "SeoKeyword"("keyword", "country", "device");

-- CreateIndex
CREATE UNIQUE INDEX "AbTest_slug_key" ON "AbTest"("slug");

-- CreateIndex
CREATE INDEX "AbTest_status_idx" ON "AbTest"("status");

-- CreateIndex
CREATE INDEX "AbTest_slug_idx" ON "AbTest"("slug");

-- CreateIndex
CREATE INDEX "HeatmapSession_path_idx" ON "HeatmapSession"("path");

-- CreateIndex
CREATE INDEX "HeatmapSession_visitorId_idx" ON "HeatmapSession"("visitorId");

-- CreateIndex
CREATE INDEX "HeatmapSession_createdAt_idx" ON "HeatmapSession"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversionFunnel_slug_key" ON "ConversionFunnel"("slug");

-- CreateIndex
CREATE INDEX "ConversionFunnel_slug_idx" ON "ConversionFunnel"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingAdmin_userId_key" ON "MarketingAdmin"("userId");

-- CreateIndex
CREATE INDEX "MarketingAdmin_userId_idx" ON "MarketingAdmin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingIntegration_provider_key" ON "MarketingIntegration"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPostAnalytics_postSlug_key" ON "BlogPostAnalytics"("postSlug");

-- CreateIndex
CREATE INDEX "BlogPostAnalytics_postSlug_idx" ON "BlogPostAnalytics"("postSlug");

-- CreateIndex
CREATE INDEX "BlogPostAnalytics_totalViews_idx" ON "BlogPostAnalytics"("totalViews");

-- CreateIndex
CREATE INDEX "BlogPostAnalytics_publishedAt_idx" ON "BlogPostAnalytics"("publishedAt");

-- AddForeignKey
ALTER TABLE "NewsletterEmailLog" ADD CONSTRAINT "NewsletterEmailLog_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactFormReply" ADD CONSTRAINT "ContactFormReply_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ContactFormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "MarketingLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotMessage" ADD CONSTRAINT "ChatbotMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatbotConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoKeyword" ADD CONSTRAINT "SeoKeyword_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "SeoPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
