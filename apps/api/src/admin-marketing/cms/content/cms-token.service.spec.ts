/**
 * `{{count:...}}` numbers (CmsTokenService.publishedCounts). Integrations
 * count only with feature status `live` (contract 1.1.0), the same rule as
 * `entity.counts.integrationsLive` on the public API.
 */
import type { PrismaService } from '../../../prisma/prisma.service';
import { CmsTokenService, liveIntegrationStatus } from './cms-token.service';

describe('liveIntegrationStatus', () => {
  it('prefers the snapshot featureStatus, then snapshot data, then the draft', () => {
    expect(liveIntegrationStatus({ featureStatus: 'beta', data: { status: 'live' } }, { status: 'coming' })).toBe('beta');
    expect(liveIntegrationStatus({ data: { status: 'live' } }, { status: 'coming' })).toBe('live');
    expect(liveIntegrationStatus(null, { status: 'live' })).toBe('live');
  });

  it('reads a missing, unknown or legacy "planned" status as coming', () => {
    expect(liveIntegrationStatus(null, {})).toBe('coming');
    expect(liveIntegrationStatus({ data: { status: 'planned' } }, {})).toBe('coming');
    expect(liveIntegrationStatus({ featureStatus: 'planned' }, { status: 'planned' })).toBe('coming');
  });
});

describe('CmsTokenService.publishedCounts', () => {
  it('counts only live integrations and every live entry of the other types', async () => {
    const integrations = [
      { published: { featureStatus: 'live' }, data: {} },
      { published: { featureStatus: 'beta' }, data: {} },
      { published: { featureStatus: 'coming' }, data: {} },
      { published: { data: { status: 'planned' } }, data: {} },
      { published: { data: { status: 'live' } }, data: {} },
    ];
    const prisma = {
      cmsEntry: {
        groupBy: jest.fn(async () => [
          { type: 'INDUSTRY', _count: { _all: 31 } },
          { type: 'INTEGRATION', _count: { _all: integrations.length } },
          { type: 'GLOSSARY_TERM', _count: { _all: 7 } },
        ]),
        findMany: jest.fn(async () => integrations),
      },
    };
    const service = new CmsTokenService(prisma as unknown as PrismaService);
    await expect(service.publishedCounts('en')).resolves.toEqual({ industries: 31, cities: 0, integrations: 2, glossary: 7, posts: 0 });

    const groupWhere = (prisma.cmsEntry.groupBy.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where;
    expect(groupWhere).toMatchObject({ locale: 'en', publishedPath: { not: null } });
  });
});
