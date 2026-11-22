-- KQ Classroom Pro, phase 2: classroom controls, participant admission and moderation audit.
-- Additive only: new columns with defaults that keep today's behaviour, and two new tables.
-- No existing row is changed. Safe to run more than once.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "LiveClass" ADD COLUMN IF NOT EXISTS "locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LiveClass" ADD COLUMN IF NOT EXISTS "waitingRoom" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LiveClass" ADD COLUMN IF NOT EXISTS "chatEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LiveClass" ADD COLUMN IF NOT EXISTS "reactionsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LiveClass" ADD COLUMN IF NOT EXISTS "screenShareAllowed" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "LiveClassParticipant" (
  "id" TEXT NOT NULL,
  "liveClassId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'admitted',
  "role" TEXT NOT NULL DEFAULT 'student',
  "handRaisedAt" TIMESTAMP(3),
  "removedReason" TEXT,
  "firstJoinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiveClassParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LiveClassParticipant_liveClassId_userId_key" ON "LiveClassParticipant"("liveClassId", "userId");
CREATE INDEX IF NOT EXISTS "LiveClassParticipant_liveClassId_status_idx" ON "LiveClassParticipant"("liveClassId", "status");

CREATE TABLE IF NOT EXISTS "LiveClassAuditLog" (
  "id" TEXT NOT NULL,
  "liveClassId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetUserId" TEXT,
  "detail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveClassAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LiveClassAuditLog_liveClassId_createdAt_idx" ON "LiveClassAuditLog"("liveClassId", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveClassParticipant_liveClassId_fkey') THEN
    ALTER TABLE "LiveClassParticipant" ADD CONSTRAINT "LiveClassParticipant_liveClassId_fkey"
      FOREIGN KEY ("liveClassId") REFERENCES "LiveClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveClassParticipant_userId_fkey') THEN
    ALTER TABLE "LiveClassParticipant" ADD CONSTRAINT "LiveClassParticipant_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveClassAuditLog_liveClassId_fkey') THEN
    ALTER TABLE "LiveClassAuditLog" ADD CONSTRAINT "LiveClassAuditLog_liveClassId_fkey"
      FOREIGN KEY ("liveClassId") REFERENCES "LiveClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
