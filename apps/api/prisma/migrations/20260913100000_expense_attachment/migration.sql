-- Expense par bill/receipt ki tasveer.
-- Page par photo attach karne ka option tha lekin column hi nahi tha,
-- is liye tasveer kabhi save nahi hoti thi.
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
