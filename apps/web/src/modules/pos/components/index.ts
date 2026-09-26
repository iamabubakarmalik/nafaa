/**
 * Saare POS ke reusable tukre yahan se milte hain.
 *
 * Pehle ye retail ke andar pare the (`@industries/retail/components/pos`)
 * aur 11 dusri industries wahan se import kar rahi thin — yani retail ko
 * chhero to sab toot jatin. Ab ye industry-neutral jagah par hain.
 */
export * from './PosNumpad';
export * from './PosShopGuard';
export * from './RequireShop';
export * from './PosQuickCash';
export * from './PosUnitPicker';
export * from './PosDeliveryPanel';
export * from './PosDiscountBar';
export { ServiceChargesPanel } from './ServiceChargesPanel';
export { VariantPicker } from './VariantPicker';
export { UnitSelectorInline } from './UnitSelectorInline';

/* ── Retail POS se nikaale hue tukre ──────────────────────────
   Design bilkul wahi jo Retail par chal raha tha — sirf jagah
   badli hai. Koi bhi industry ab yehi bill, wohi cart aur wohi
   discount modal do satar me le sakti hai. */
export { PosReceiverField, emptyReceiver, type PosReceiverValue } from './PosReceiverField';
export { PosSettingsModal } from './PosSettingsModal';
export { PosCheckoutModal } from './PosCheckoutModal';
export { PosDiscountModal } from './PosDiscountModal';
export { PosUnitPickerModal } from './PosUnitPickerModal';
export { PosWeighModal } from './PosWeighModal';
export { PosCartPanel, PosCartRow } from './PosCartPanel';
export { PosCustomerPicker } from './PosCustomerPicker';
export { PosTeacher } from './PosTeacher';
export { PosSuccessModal, type PosLastSale } from './PosSuccessModal';
export { PosCustomerAddModal } from './PosCustomerAddModal';
export { PosHoldCartsModal } from './PosHoldCartsModal';
export {
  PosViewTab, PosProductTile, PosComboTile, PosQuickKeyTile, PosEmptyState,
} from './PosTiles';
