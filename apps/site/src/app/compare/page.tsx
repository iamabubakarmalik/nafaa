/**
 * Hub: /compare (compare and alternative pages).
 * The PAGE entry at this path when published; otherwise a noindex directory.
 */
import type { Metadata } from 'next';
import { hubMetadata, loadHubEntry, type HubCopy } from '@/templates/city/common/hub';
import { stringsFor } from '@/templates/city/common/strings';
import { CompareIndex } from '@/templates/compare/CompareIndex';

export const revalidate = 86400;

const PATH = '/compare';
const t = stringsFor('en');
const COPY: HubCopy = { path: PATH, title: t.compareDirectoryTitle, intro: t.compareDirectoryIntro };

export async function generateMetadata(): Promise<Metadata> {
  return hubMetadata(await loadHubEntry(PATH), COPY);
}

export default async function Page() {
  return <CompareIndex entry={await loadHubEntry(PATH)} copy={COPY} section="compare" />;
}
