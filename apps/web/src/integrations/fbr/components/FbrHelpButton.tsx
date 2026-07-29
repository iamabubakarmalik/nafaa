import { useState } from 'react';
import { HelpCircle, ExternalLink, Phone, Mail, Play, FileText } from 'lucide-react';
import { Modal } from '@core/ui/Modal';
import { Button } from '@core/ui/Button';

export function FbrHelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        leftIcon={<HelpCircle className="h-4 w-4" />}
      >
        Help & Support
      </Button>

      {open && (
        <Modal open onClose={() => setOpen(false)} title="FBR Help Center" size="lg">
          <div className="space-y-4">

            {/* Video guide */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border border-rose-200 dark:border-rose-800">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-rose-500 flex items-center justify-center shrink-0">
                  <Play className="h-6 w-6 text-white" />
                </div>

                <div className="flex-1">
                  <div className="font-black text-rose-900 dark:text-rose-300">
                    Video Guide (Urdu)
                  </div>

                  <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                    "FBR se API credentials kaise len" — 8 min complete walkthrough
                  </p>

                  <a
                    href="https://www.youtube.com/results?search_query=FBR+POS+integration+urdu"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-black text-rose-600 hover:underline mt-2"
                  >
                    Watch on YouTube <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Portal links */}
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="font-black text-blue-900 dark:text-blue-300 mb-2">
                FBR Official Portals
              </div>

              <div className="space-y-2">
                <a
                  href="https://iris.fbr.gov.pk"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  IRIS Portal (NTN Registration)
                </a>

                <a
                  href="https://esp.fbr.gov.pk"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  POS Integration Portal
                </a>

                <a
                  href="https://download1.fbr.gov.pk"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  API Documentation
                </a>
              </div>
            </div>

            {/* Contact */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="font-black text-emerald-900 dark:text-emerald-300 mb-3">
                FBR Contact
              </div>

              <div className="space-y-2">
                <a
                  href="tel:051-111-772-772"
                  className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  051-111-772-772
                </a>

                <a
                  href="mailto:psid@fbr.gov.pk"
                  className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  psid@fbr.gov.pk
                </a>

                <a
                  href="https://wa.me/923241772933"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  💬 Nafaa Support (WhatsApp)
                </a>
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h3 className="font-black text-slate-900 dark:text-white mb-2">
                Aksar Poochay Jaane Wale Sawal
              </h3>

              <div className="space-y-2">
                <FAQ
                  q="Kya FBR use karna zaroori hai?"
                  a="Nahi. Sirf jinki yearly turnover Rs 5 million+ hai unke liye zaroori hai."
                />

                <FAQ
                  q="API credentials milne mein kitna time lagta hai?"
                  a="5-15 din. Approval FBR ke workload pe depend karta hai."
                />

                <FAQ
                  q="Kya Nafaa ki taraf se koi fee hai?"
                  a="Nahi, bilkul free hai."
                />

                <FAQ
                  q="Rejection ho gayi to kya karain?"
                  a="System automatically retry karta hai aur email notify karega."
                />

                <FAQ
                  q="Kya sales private rakh sakta hoon?"
                  a="Haan. FBR disable kar sakte ho ya sale skip kar sakte ho."
                />
              </div>
            </div>

          </div>
        </Modal>
      )}
    </>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 transition"
    >
      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-between">
        {q}
        <span className="text-slate-400">{open ? '−' : '+'}</span>
      </div>

      {open && (
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
          {a}
        </div>
      )}
    </button>
  );
}