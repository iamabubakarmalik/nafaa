/** Merchant rich text. The API sanitises on save (allow-list in the contract). */
export function RichText({ html, className = '' }: { html: string | null | undefined; className?: string }) {
  if (!html) return null;
  return <div className={`rte ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
