-- KQ Academy: complete referral commissions, payment currency, social media links.
-- Additive only: nullable columns, one new table, indexes. No existing row is changed:
-- historical commissions keep their amount and status; old payments keep a null currency.
-- Safe to run more than once.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "currency" TEXT;

ALTER TABLE "AffiliateEarning" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "AffiliateEarning" ADD COLUMN IF NOT EXISTS "baseAmount" DOUBLE PRECISION;
ALTER TABLE "AffiliateEarning" ADD COLUMN IF NOT EXISTS "baseCurrency" TEXT;
ALTER TABLE "AffiliateEarning" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "AffiliateEarning" ADD COLUMN IF NOT EXISTS "ratePercent" DOUBLE PRECISION;
ALTER TABLE "AffiliateEarning" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "AffiliateEarning" ADD COLUMN IF NOT EXISTS "reversedAt" TIMESTAMP(3);
ALTER TABLE "AffiliateEarning" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
ALTER TABLE "AffiliateEarning" ADD COLUMN IF NOT EXISTS "sourceKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateEarning_sourceKey_key" ON "AffiliateEarning"("sourceKey");
CREATE INDEX IF NOT EXISTS "AffiliateEarning_ownerId_status_idx" ON "AffiliateEarning"("ownerId", "status");
CREATE INDEX IF NOT EXISTS "AffiliateEarning_status_createdAt_idx" ON "AffiliateEarning"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "SocialLink" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SocialLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SocialLink_platform_key" ON "SocialLink"("platform");

COMMIT;
