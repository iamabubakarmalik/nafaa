-- WhatsApp ke tayyar paighaam — dukaan-daar apne alfaaz me likhe.
--
-- Pehle WhatsApp ka sirf ek on/off switch tha jo "WhatsApp Business
-- API" maangta tha. Aam dukaan-daar ke paas wo hoti hi nahi, is liye
-- feature kisi kaam ka nahi tha. `wa.me` link ke liye koi API chahiye
-- hi nahi — phone par WhatsApp khul jata hai aur paighaam pehle se
-- likha hua milta hai.
--
-- Column nullable hai: purani dukaanon par kuch nahi badalta, app
-- khud tayyar paighaam dikha deta hai jab tak malik apne na likhe.

ALTER TABLE "TenantSettings"
  ADD COLUMN IF NOT EXISTS "whatsappTemplates" JSONB;
