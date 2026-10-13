-- Staff approval PIN: the owner can give a person their own PIN to approve
-- PIN-protected actions (discount above the limit, refund, void, credit over
-- the limit) that the person also holds the permission for. One nullable
-- column; nothing existing changes.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "approvalPin" TEXT;
