/**
 * Hub: /compliance (one page per tax authority).
 * The PAGE entry at this path when published; otherwise a noindex directory.
 */
import type { Metadata } from 'next';
import { hubMetadata, loadHubEntry, type HubCopy } from '@/templates/city/common/hub';
import { stringsFor } from '@/templates/city/common/strings';
import { ComplianceIndex } from '@/templates/compliance/ComplianceIndex';

export const revalidate = 86400;

const PATH = '/compliance';
const t = stringsFor('en');
const COPY: HubCopy = { path: PATH, title: t.complianceDirectoryTitle, intro: t.complianceDirectoryIntro };

export async function generateMetadata(): Promise<Metadata> {
  return hubMetadata(await loadHubEntry(PATH), COPY);
}

export default async function Page() {
  return <ComplianceIndex entry={await loadHubEntry(PATH)} copy={COPY} />;
}
