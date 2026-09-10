/**
 * Sale item ka display naam.
 *
 * Har sale item ke saath product nahi hota:
 *   • used phone bikta hai   → productId null, usedPhone bhara hota hai
 *   • repair deliver hoti hai → productId null, note me kaam likha hota hai
 *
 * Seedha `item.product.name` padhne se ye dono soorat me screen crash
 * kar jati thi. Har jagah yehi helper istemal karein.
 */
export function saleItemName(item: any): string {
  if (!item) return 'Item';

  const productName: string | undefined = item.product?.name;
  const variantName: string | undefined = item.variantLink?.variant?.name ?? item.variant?.name;

  if (productName) {
    return variantName ? `${productName} (${variantName})` : productName;
  }

  // Used phone: "Samsung A54 (UP-0007)"
  const used = item.usedPhone;
  if (used) {
    const model = [used.brand, used.model, used.storage].filter(Boolean).join(' ');
    return used.usedPhoneCode ? `${model} (${used.usedPhoneCode})` : model || 'Used phone';
  }

  // Repair aur baaki service items ka naam note me hota hai —
  // pehla hissa (em-dash se pehle) hi asli naam hai.
  if (typeof item.note === 'string' && item.note.trim()) {
    return item.note.split('—')[0].trim() || item.note.trim();
  }

  return 'Item';
}
