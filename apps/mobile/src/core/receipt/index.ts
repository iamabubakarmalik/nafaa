/**
 * The one receipt engine of the app: every bill (POS, history, returns,
 * industries) prints and shares through here, in the shop's design (Settings
 * → Receipt) and bill language, with the Nafaa line on every print.
 *
 *   const { data: setup } = useReceiptSetup();
 *   await printReceipt(doc, { setup, lang });
 *   await shareReceiptPdf(doc, { setup, lang });
 *   await sendReceiptWhatsApp(doc, lang, customerPhone);
 *
 * Industry rows (table, token, karat…): registerReceiptIndustry() in industry.ts.
 */

export * from './types';
export { NAFAA, DEFAULT_DESIGN, normalizeSetup, getReceiptSetup, fetchReceiptSetup, useReceiptSetup, devicePaper, setDevicePaper, printPaper, RECEIPT_SETUP_KEY } from './setup';
export { renderReceipt, amountInWords, PAY_KIND_LABEL } from './html';
export { saleToReceipt, saleRowToReceipt, paymentParts, paymentLabel } from './fromSale';
export { printReceipt, shareReceiptPdf, receiptText, sendReceiptWhatsApp, waNumber, setReceiptPrinter, currentPrinter, systemPrinter, type ReceiptPrinter, type PrintJob } from './print';
export { rw, methodWord, type ReceiptLang } from './words';
export { useBillLanguage } from './language';
export { registerReceiptIndustry, applyReceiptIndustry, type ReceiptAdditions, type ReceiptExtender, type ReceiptIndustryContext } from './industry';
