/** Platform, status, pillar and campaign filters for post lists. */

import { CircleDot, Flag, Layers, Share2 } from 'lucide-react';
import { FilterMenu } from '@/design-system/components';
import { POST_STATUSES, SOCIAL_PLATFORMS, type SocialSettings } from '@/api/admin-brand-social.api';
import { PLATFORM, STATUS } from '../lib/platforms';

export interface PostFilterValue { platform: string; status: string; pillar: string; campaign: string }
export const NO_FILTERS: PostFilterValue = { platform: 'ALL', status: 'ALL', pillar: 'ALL', campaign: 'ALL' };

/** API params from the filter value ("ALL" is left out). */
export const filterParams = (f: PostFilterValue) => ({
  platform: f.platform === 'ALL' ? undefined : f.platform,
  status: f.status === 'ALL' ? undefined : f.status,
  pillar: f.pillar === 'ALL' ? undefined : f.pillar,
  campaign: f.campaign === 'ALL' ? undefined : f.campaign,
});

export function PostFilters({ value, onChange, settings }: { value: PostFilterValue; onChange: (v: PostFilterValue) => void; settings?: SocialSettings }) {
  const set = (k: keyof PostFilterValue) => (v: string) => onChange({ ...value, [k]: v });
  return (
    <>
      <FilterMenu icon={Share2} label="Platform" value={value.platform} active={value.platform !== 'ALL'} onChange={set('platform')}
        options={[{ value: 'ALL', label: 'All platforms' }, ...SOCIAL_PLATFORMS.map((p) => ({ value: p, label: PLATFORM[p].label, color: PLATFORM[p].color }))]} />
      <FilterMenu icon={CircleDot} label="Status" value={value.status} active={value.status !== 'ALL'} onChange={set('status')}
        options={[{ value: 'ALL', label: 'Every status' }, ...POST_STATUSES.map((s) => ({ value: s, label: STATUS[s].label, color: STATUS[s].color }))]} />
      <FilterMenu icon={Layers} label="Pillar" value={value.pillar} active={value.pillar !== 'ALL'} onChange={set('pillar')}
        options={[{ value: 'ALL', label: 'Every pillar' }, ...(settings?.pillars ?? []).map((p) => ({ value: p.key, label: p.label, color: p.color }))]} />
      <FilterMenu icon={Flag} label="Campaign" value={value.campaign} active={value.campaign !== 'ALL'} onChange={set('campaign')} align="right"
        options={[{ value: 'ALL', label: 'Every campaign' }, ...(settings?.campaigns ?? []).map((c) => ({ value: c.key, label: c.label, hint: c.active ? undefined : 'Ended' }))]} />
    </>
  );
}
