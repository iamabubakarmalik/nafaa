/* ═════════════════════════════════════════════════════════════
   COMMISSION — bandon ka hissa
   ─────────────────────────────────────────────────────────────
   Ye kisi ek industry ka nahi, poore system ka hissa hai:

       Staff → Commission      (/staff/commission)

   Kisi bhi dashboard par chhota khana lagana ho to ek line:

       import { CommissionCard } from '@modules/hr/commission';
       <CommissionCard tone="pink" hideAmounts={hideCost} />

   `tone`: pink · sky · emerald · blue · violet (default violet —
   Staff section ka rang).

   KAISE CHALTA HAI
     1. Rule — do alag faisle: KIS PAR (bikri/munafa/har bill) aur
        KITNA (percent ya seedhi raqam).
     2. Har bande ko alag se CHAALU karein. Switch band = commission 0.
     3. Hisab server par asli bikri se banta hai. Void bill nahi gine
        jate, aur wapas aaya maal har line se khud kat jata hai.

   Staff (HR record) aur User (login) alag cheezein hain — bikri
   hamesha login ke naam lagti hai. Dono email/phone se khud jur
   jate hain; jis employee ka login hi nahi, safha use alag se
   dikha deta hai.
   ═════════════════════════════════════════════════════════════ */

export { default as CommissionPage } from './pages/CommissionPage';
export { CommissionCard } from './components/CommissionCard';
export { CommissionRuleModal } from './components/CommissionRuleModal';
export { CommissionDetailDrawer } from './components/CommissionDetailDrawer';
export { useCommission, useCommissionDetail, periodLabel, recentPeriods, thisPeriod } from './hooks/useCommission';
export { commissionApi, BASIS_META } from './api/commission.api';
export type {
  CommissionRule, CommissionRow, CommissionLine, CommissionBasis,
  CommissionValueType, CommissionSummary, CommissionDetail, CommissionPerson,
} from './api/commission.api';
