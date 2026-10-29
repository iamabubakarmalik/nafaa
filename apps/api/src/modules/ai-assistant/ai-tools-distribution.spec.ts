import { TOOL_SPECS, toolDefinitions } from './ai-tools.service';

describe('distribution AI tools', () => {
  it('sit at the end of the list, so the cached prompt prefix before them does not change', () => {
    const names = TOOL_SPECS.map((t) => t.name);
    expect(names.slice(-2)).toEqual(['distribution_dsr', 'route_recovery']);
    expect(names.indexOf('production_summary')).toBe(names.length - 3);
  });

  it('ask for the permissions of the data they read', () => {
    const dsr = TOOL_SPECS.find((t) => t.name === 'distribution_dsr')!;
    const rec = TOOL_SPECS.find((t) => t.name === 'route_recovery')!;
    expect(dsr.needs).toEqual(['distribution.orders.view', 'reports.view']);
    expect(rec.needs).toEqual(['khata.view']);
    expect(toolDefinitions().some((t) => t.name === 'route_recovery')).toBe(true);
  });
});
