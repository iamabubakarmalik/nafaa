-- Supplier ko adaigi kis zariye hui.
--
-- Cash register ka hisab isi par tikta hai: cash wali adaigi golak
-- se nikalti hai, bank ya cheque wali nahi. Pehle ye maloom hi nahi
-- tha, is liye har adaigi ko cash maana ja raha tha.
--
-- Column nullable hai aur koi default nahi: purani entriyon par
-- NULL rahega, aur code NULL ko cash maanta hai — yani purane
-- hisab me koi tabdeeli nahi aati.

ALTER TABLE "SupplierLedger"
  ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";
