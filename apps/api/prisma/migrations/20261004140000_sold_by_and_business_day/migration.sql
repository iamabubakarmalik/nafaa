-- Do cheezein, dono purani dukaanon ke liye bilkul mehfooz:
--
--  1. Sale.soldById — bikri kis ke naam. Purani sales par NULL
--     rahega, aur jahan NULL ho wahan `createdById` hi becha hua
--     mana jata hai. Is liye koi purana hisab nahi badalta.
--
--  2. TenantSettings.businessDayStartHour — karobari din kis ghante
--     shuru ho. Default 0 (raat 12 baje) = bilkul wohi behaviour
--     jo abhi hai. Jo dukaan khud badlegi, sirf us ka hisab badlega.

ALTER TABLE "Sale" ADD COLUMN "soldById" TEXT;
CREATE INDEX "Sale_soldById_idx" ON "Sale"("soldById");
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_soldById_fkey"
  FOREIGN KEY ("soldById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TenantSettings" ADD COLUMN "businessDayStartHour" INTEGER NOT NULL DEFAULT 0;
