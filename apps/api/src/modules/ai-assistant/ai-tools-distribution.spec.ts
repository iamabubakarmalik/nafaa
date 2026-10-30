import { TOOL_SPECS, toolDefinitions } from './ai-tools.service';

describe('distribution AI tools', () => {
  it('sit at the end of the list, so the cached prompt prefix before them does not change', () => {
    const names = TOOL_SPECS.map((t) => t.name);
    expect(names.slice(-5)).toEqual(['distribution_dsr', 'route_recovery', 'targets_status', 'van_stock', 'pending_claims']);
    expect(names.indexOf('production_summary')).toBe(names.length - 6);
  });

  it('ask for the permissions of the data they read', () => {
    const dsr = TOOL_SPECS.find((t) => t.name === 'distribution_dsr')!;
    const rec = TOOL_SPECS.find((t) => t.name === 'route_recovery')!;
    expect(dsr.needs).toEqual(['distribution.orders.view', 'reports.view']);
    expect(rec.needs).toEqual(['khata.view']);
    expect(toolDefinitions().some((t) => t.name === 'route_recovery')).toBe(true);
    expect(TOOL_SPECS.find((t) => t.name === 'targets_status')!.needs).toEqual(['distribution.orders.view']);
    expect(TOOL_SPECS.find((t) => t.name === 'van_stock')!.needs).toEqual(['distribution.orders.view']);
    expect(TOOL_SPECS.find((t) => t.name === 'pending_claims')!.needs).toEqual(['distribution.claims.manage']);
  });
});
