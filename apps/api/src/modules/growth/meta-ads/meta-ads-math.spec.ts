import {
  actionValue, adBody, adSetBody, apiImportKey, boostProblem, campaignBody, changedBudget, cleanAudience, creativeBody, fromMinor, insightsToSpend,
  mapCampaign, mapInsightRow, pullWindow, targetingOf, toMinor, type BoostPlan,
} from './meta-ads-math';

describe('meta ads maths', () => {
  it('converts budgets to and from minor units', () => {
    expect(fromMinor('50000', 'PKR')).toBe(500);
    expect(fromMinor('1500', 'JPY')).toBe(1500);
    expect(fromMinor(null, 'PKR')).toBeNull();
    expect(fromMinor('0', 'USD')).toBeNull();
    expect(toMinor(500, 'PKR')).toBe('50000');
    expect(toMinor(12.5, 'USD')).toBe('1250');
    expect(changedBudget(1000, -20, 'PKR')).toBe(800);
    expect(changedBudget(260, -50, 'PKR')).toBe(250);
  });

  it('reads a campaign and its budget level', () => {
    const c = mapCampaign({ id: '1', name: 'Eid', status: 'ACTIVE', effective_status: 'ACTIVE', objective: 'OUTCOME_SALES', daily_budget: '200000' }, 'PKR');
    expect(c).toMatchObject({ id: '1', dailyBudget: 2000, budgetLevel: 'CAMPAIGN' });
    expect(mapCampaign({ id: '2', status: 'WEIRD' }, 'PKR')).toMatchObject({ name: '2', status: 'PAUSED', budgetLevel: 'ADSET' });
  });

  it('maps insights with one purchase type only', () => {
    const actions = [
      { action_type: 'purchase', value: '4' },
      { action_type: 'omni_purchase', value: '5' },
      { action_type: 'offsite_conversion.fb_pixel_purchase', value: '4' },
      { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '7' },
    ];
    expect(actionValue(actions, ['omni_purchase', 'purchase'])).toBe(5);
    const row = mapInsightRow({
      date_start: '2026-11-08', date_stop: '2026-11-08', campaign_id: '11', campaign_name: 'Lawn', adset_id: '22', adset_name: 'Lahore',
      spend: '1500.50', impressions: '12000', clicks: '340', actions, action_values: [{ action_type: 'omni_purchase', value: '9000' }],
    })!;
    expect(row).toMatchObject({ day: '2026-11-08', spend: 1500.5, impressions: 12000, clicks: 340, purchases: 5, purchaseValue: 9000, conversations: 7, cpa: 300.1, metaRoas: 6 });
    expect(mapInsightRow({ date_start: 'x', campaign_id: '1' })).toBeNull();
  });

  it('turns insights into spend rows and converts other currencies', () => {
    const row = mapInsightRow({ date_start: '2026-11-08', campaign_id: '11', campaign_name: 'Lawn', adset_id: '22', adset_name: 'Lahore', spend: '10', actions: [] })!;
    const zero = mapInsightRow({ date_start: '2026-11-08', campaign_id: '12', campaign_name: 'Off', spend: '0' })!;
    expect(insightsToSpend([row, zero], 'PKR', 'PKR', null)).toEqual([{ day: '2026-11-08', campaign: 'Lawn', adSet: 'Lahore', amount: 10, orders: null, importKey: 'META:API:22:2026-11-08', note: null }]);
    expect(insightsToSpend([row], 'USD', 'PKR', 280)[0]).toMatchObject({ amount: 2800, note: 'USD 10 × 280' });
    expect(() => insightsToSpend([row], 'USD', 'PKR', null)).toThrow('RATE_NEEDED');
    expect(apiImportKey({ day: '2026-11-08', campaignId: '11', adSetId: null })).toBe('META:API:11:2026-11-08');
  });

  it('pulls a short window to catch late conversions', () => {
    expect(pullWindow('2026-11-09', 3)).toEqual({ since: '2026-11-07', until: '2026-11-09' });
    expect(pullWindow('2026-03-01', 2)).toEqual({ since: '2026-02-28', until: '2026-03-01' });
  });

  it('builds audiences', () => {
    const a = cleanAudience({ cities: [{ key: '2211096', name: 'Lahore' }, { key: 'bad' }], ageMin: 15, ageMax: 99, gender: 'FEMALE' });
    expect(a).toEqual({ cities: [{ key: '2211096', name: 'Lahore' }], ageMin: 18, ageMax: 65, gender: 'FEMALE' });
    const t = targetingOf(a);
    expect(t.geo_locations).toEqual({ cities: [{ key: '2211096', radius: 25, distance_unit: 'kilometer' }], location_types: ['home', 'recent'] });
    expect(t.genders).toEqual([2]);
    expect(targetingOf(cleanAudience({})).geo_locations).toMatchObject({ countries: ['PK'] });
  });

  const plan = (o: Partial<BoostPlan> = {}): BoostPlan => ({
    name: 'Boost: Lawn suit', destination: 'WEBSITE', link: 'https://shop.pk/p/lawn?utm_source=facebook', pageId: 'P1', instagramUserId: 'IG1', pixelId: null,
    dailyBudget: 1000, days: 5, currency: 'PKR', audience: cleanAudience({}), copy: { headline: 'Naya lawn', primaryText: 'Abhi order karein', description: null },
    imageHash: 'abc', start: new Date('2026-11-09T10:00:00Z'), ...o,
  });

  it('creates the boost campaign paused with the right objective', () => {
    expect(campaignBody(plan())).toMatchObject({ objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', daily_budget: '100000', special_ad_categories: [] });
    expect(campaignBody(plan({ pixelId: '999' })).objective).toBe('OUTCOME_SALES');
    expect(campaignBody(plan({ destination: 'WHATSAPP', link: null })).objective).toBe('OUTCOME_SALES');
  });

  it('builds ad set, creative and ad bodies', () => {
    const s = adSetBody(plan(), 'C1');
    expect(s).toMatchObject({ campaign_id: 'C1', status: 'PAUSED', optimization_goal: 'LINK_CLICKS', destination_type: 'WEBSITE', end_time: '2026-11-14T10:00:00.000Z' });
    expect(adSetBody(plan({ pixelId: '9' }), 'C1')).toMatchObject({ optimization_goal: 'OFFSITE_CONVERSIONS', promoted_object: { pixel_id: '9', custom_event_type: 'PURCHASE' } });
    expect(adSetBody(plan({ destination: 'WHATSAPP' }), 'C1')).toMatchObject({ destination_type: 'WHATSAPP', optimization_goal: 'CONVERSATIONS', promoted_object: { page_id: 'P1' } });
    const cr = creativeBody(plan());
    expect(cr.object_story_spec).toMatchObject({ page_id: 'P1', instagram_user_id: 'IG1', link_data: { image_hash: 'abc', call_to_action: { type: 'SHOP_NOW' } } });
    expect(creativeBody(plan({ destination: 'WHATSAPP' })).object_story_spec.link_data.call_to_action).toEqual({ type: 'WHATSAPP_MESSAGE', value: { app_destination: 'WHATSAPP' } });
    expect(adBody(plan(), 'S1', 'CR1')).toEqual({ name: 'Boost: Lawn suit · ad', adset_id: 'S1', creative: { creative_id: 'CR1' }, status: 'PAUSED' });
  });

  it('checks the wizard input', () => {
    const p = plan();
    expect(boostProblem(p)).toBeNull();
    expect(boostProblem({ ...p, link: 'http://x' })).toBe('LINK');
    expect(boostProblem({ ...p, dailyBudget: 100 })).toBe('BUDGET');
    expect(boostProblem({ ...p, days: 0 })).toBe('DAYS');
    expect(boostProblem({ ...p, destination: 'WHATSAPP', link: null })).toBeNull();
  });
});
