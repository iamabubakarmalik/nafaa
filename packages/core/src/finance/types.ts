/** Shapes of the profit and loss statement the API returns (GET /reports/pnl). */

export interface ProfitSplit {
  basis: 'PAID' | 'BILL';
  billProfit: number;
  realised: number;
  fromOlderBills: number;
  pending: number;
  writtenOff: number;
  headline: number;
  /** Lines sold with no cost anywhere: their whole sale was counted as profit. */
  noCost?: { products: number; lines: number; revenue: number };
}

export interface ExpenseCategoryRef { id: string; name: string; color: string }

export interface PnlStatement {
  revenue: {
    gross: number; discount: number; manualDiscount: number; codeDiscount: number; loyaltyDiscount: number;
    serviceCharges: number; sales: number; returns: number; net: number;
    bills: number; returnCount: number; credit: number; avgBill: number;
  };
  cogs: { saved: number; estimated: number; returned: number; total: number; estimatedLines: number; unknownLines: number; unknownRevenue: number } | null;
  grossProfit: number | null;
  grossMargin: number | null;
  profitSplit?: ProfitSplit | null;
  expenses: {
    paid: number; count: number;
    categories: Array<ExpenseCategoryRef & { amount: number; count: number }>;
    salaries: number; salaryCount: number; commission: number; commissionCount: number;
    total: number;
  };
  writeOffs: {
    damage: number; loss: number; countedShort: number; found: number; net: number; count: number;
    stockLoss?: number; stockGain?: number; correction?: number; correctionCount?: number;
  } | null;
  otherIncome: { income?: number; incomeCount?: number; bookingKept: number; bookingCount: number; total: number };
  operatingProfit: number | null;
  netProfit: number | null;
  netMargin: number | null;
}
