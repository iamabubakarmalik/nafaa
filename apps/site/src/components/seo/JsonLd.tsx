/**
 * Renders one JSON-LD document. `<` is escaped so content can never close the
 * script tag. Build the document with src/lib/seo/graph.ts.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
