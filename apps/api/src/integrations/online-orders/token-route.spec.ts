import { tokenRoute } from './website-api.controller';

const KEY = 'nfk_1c9c8def45570135f3e032db9e4c1cfb7281b97660752dac';
const req = (headers: Record<string, string>) => ({ headers } as any);

describe('tokenRoute — Indolj branch ki pehchan Token ki shakal se', () => {
  it('nfk_ ke saath aur baghair alag route dete hain', () => {
    expect(tokenRoute(req({ token: KEY }), KEY)).toBe('token:nfk_1c9c8def');
    expect(tokenRoute(req({ token: KEY.slice(4) }), KEY)).toBe('token:1c9c8def');
    expect(tokenRoute(req({ authorization: `Bearer ${KEY}` }), KEY)).toBe('token:nfk_1c9c8def');
  });
  it('key ke baad wala hissa bhi route me (teesri branch ke liye)', () => {
    expect(tokenRoute(req({ token: `${KEY}-gulshan` }), KEY)).toBe('token:nfk_1c9c8def+-gulshan');
  });
  it('key header me na ho to null', () => {
    expect(tokenRoute(req({ 'user-agent': 'x' }), KEY)).toBeNull();
  });
});
