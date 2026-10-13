/** Page guide: what PRA, SRB, KPRA and FBR POS are, in plain words, and how this section works. */

import { BarChart3, FileText, Landmark, Printer, RefreshCw, Settings2 } from 'lucide-react';
import { PageGuide } from '@core/components/PageGuide';

export function TaxGuide({ onClose }: { onClose: () => void }) {
  return (
    <PageGuide title="Tax — aasaan tareeqa" description="Har bill authority ko, bill par us ka number, aur mahine ke aakhir me return ke figures" onClose={onClose}
      steps={[
        { icon: Landmark, color: '#16a34a', title: 'Kaunsi authority?', text: 'Punjab me services (restaurant, salon, gym) ka tax PRA leta hai, Sindh me SRB, KP me KPRA. Bara retail store ya chain (Tier-1) jo maal bechta hai, woh FBR POS par hota hai.' },
        { icon: Settings2, color: '#7c3aed', title: 'Ek dafa set karein', text: 'Settings me authority chunein, har branch ka POS ID aur token/password likhein, pehle Sandbox me test bill bhejein, phir Live chalu karein. Har branch sirf ek authority ko bhejti hai.' },
        { icon: FileText, color: '#2563eb', title: 'Har bill khud jata hai', text: 'Sale hote hi bill authority ko jata hai aur bill par us ka number aur QR chhapta hai. Internet na ho to bill rukta nahi, Nafaa baad me khud bhej deta hai.' },
        { icon: RefreshCw, color: '#e11d48', title: 'Fail bill', text: 'Invoices me fail bill ki wajah aur authority ka poora jawab dikhta hai. Aksar ghalat POS ID, token ya PCT code hota hai. Theek karke "Dobara" ya "Sab fail dobara bhejein" dabayein. Ek bill do dafa nahi jata.' },
        { icon: BarChart3, color: '#0891b2', title: 'Overview', text: 'Taxable sale (tax ke baghair), jama hua tax, har authority ne kitne bill liye aur is mahine ka muqabla pichle mahine ke isi din tak se.' },
        { icon: Printer, color: '#d97706', title: 'Mahine ki report', text: 'Return file karne ke figures: sale, output tax, return (credit notes) aur net tax, rate aur branch ke hisaab se. A4 print ya CSV nikal kar accountant ko dein.' },
      ]}
      tips={[
        'Report me sirf woh bill aate hain jo authority ne qabool kiye. Return file karne se pehle fail bill bhej dein.',
        'Bill ki qeemat tax samet maani jati hai. Rs 1,160 ke bill par 16% ho to 1,000 sale aur 160 tax.',
        'Invoices ki tareekh woh hai jab bill authority ko bheja gaya; report bill ke din ke hisaab se hai.',
        'Live me test bill nahi bhejte, woh bhi asli tax invoice ban jata hai. KPRA ka test server nahi hota.',
        'Token, password aur key kabhi screen par wapas nahi dikhte. Badalna ho to naya likhein.',
      ]}
      shortcuts={[['1', 'overview'], ['2', 'invoices'], ['3', 'report'], ['4', 'settings'], ['/', 'dhoondein'], ['G', 'guide']]}
    />
  );
}
