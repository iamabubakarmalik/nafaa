/**
 * Hub: /pos-software (city hubs by province).
 * The PAGE entry at this path when published; otherwise a noindex directory.
 */
import type { Metadata } from 'next';
import { hubMetadata, loadHubEntry, type HubCopy } from '@/templates/city/common/hub';
import { stringsFor } from '@/templates/city/common/strings';
import { CityIndex } from '@/templates/city/CityIndex';

export const revalidate = 86400;

const PATH = '/pos-software';
const t = stringsFor('en');
const COPY: HubCopy = { path: PATH, title: t.cityDirectoryTitle, intro: t.cityDirectoryIntro };

export async function generateMetadata(): Promise<Metadata> {
  return hubMetadata(await loadHubEntry(PATH), COPY);
}

export default async function Page() {
  return <CityIndex entry={await loadHubEntry(PATH)} copy={COPY} />;
}
