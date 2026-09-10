-- Repair ticket ko us Sale se jodta hai jo delivery par banti hai.
-- Isi link se repair ki kamai dashboard, profit aur cash register tak pahunchti hai.

-- AlterTable
ALTER TABLE "RepairTicket" ADD COLUMN "saleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RepairTicket_saleId_key" ON "RepairTicket"("saleId");

-- AddForeignKey
ALTER TABLE "RepairTicket" ADD CONSTRAINT "RepairTicket_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
