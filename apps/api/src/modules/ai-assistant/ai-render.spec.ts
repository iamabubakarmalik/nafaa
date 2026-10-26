import { FollowupFilter, detectLang, hourRange, ruleActionPlan, ruleToolPlan, suggestionsFor, templateIntent } from './ai-render';

describe('Nafaa AI routing and text helpers', () => {
  it('detects the reply language', () => {
    expect(detectLang('Is hafte sab se zyada profit kis cheez par hua?')).toBe('roman');
    expect(detectLang('What were the top products last week?')).toBe('en');
    expect(detectLang('آج کی سیل کتنی ہے؟')).toBe('ur');
  });

  it('answers only short plain questions from templates', () => {
    expect(templateIntent('aaj ki sale kitni hai?')).toBe('today_sale');
    expect(templateIntent('kya mangwana hai')).toBe('low_stock');
    expect(templateIntent('subah ka khulasa')).toBe('morning');
    expect(templateIntent('aaj ki sale kyun kam hai?')).toBeNull();
    expect(templateIntent('reorder se order banao')).toBeNull();
  });

  describe('rules parser: bills', () => {
    const bill = (t: string) => ruleActionPlan(t)?.[0];
    it.each([
      ['2 chakki atta aur 1 black tea ka cash bill banao', { items: [{ product: 'chakki atta', qty: 2 }, { product: 'black tea', qty: 1 }], payment_method: 'cash' }],
      ['bill banao: chakki atta 2, black tea 1', { items: [{ product: 'chakki atta', qty: 2 }, { product: 'black tea', qty: 1 }] }],
      ['Hamza Sheikh ke khate me 3 basmati rice ka bill banao', { items: [{ product: 'basmati rice', qty: 3 }], customer: 'hamza sheikh', on_khata: true }],
      ['2x yogurt, 1 butter card se bill', { items: [{ product: 'yogurt', qty: 2 }, { product: 'butter', qty: 1 }], payment_method: 'card' }],
      ['make a bill for 2 atta and 1 tea cash', { items: [{ product: 'atta', qty: 2 }, { product: 'tea', qty: 1 }], payment_method: 'cash' }],
      ['bill banao 2 chakki atta + 1 pepsi 1.5l naqd', { items: [{ product: 'chakki atta', qty: 2 }, { product: 'pepsi 1.5l', qty: 1 }], payment_method: 'cash' }],
      ['bill banao 1 basmati rice udhaar hamza sheikh', { items: [{ product: 'basmati rice', qty: 1 }], customer: 'hamza sheikh', on_khata: true }],
    ])('%s', (text, input) => {
      expect(bill(text)).toEqual({ name: 'propose_sale', input });
    });
    it('does not treat a question about bills as an order', () => {
      expect(ruleActionPlan('aaj kitne bill bane?')).toBeNull();
    });
  });

  describe('rules parser: products', () => {
    it.each([
      ['Pepsi 1.5L product banao price 220 cost 190 stock 50', { name: 'Pepsi 1.5L', price: 220, cost_price: 190, stock: 50 }],
      ['naya product Lays 50g, price 60, stock 100', { name: 'Lays 50g', price: 60, stock: 100 }],
      ['add product Surf Excel 1kg price 450 cost 400', { name: 'Surf Excel 1kg', price: 450, cost_price: 400 }],
      ['product banao Test Biscuit price 120 cost 90 stock 24 barcode NAI777001', { name: 'Test Biscuit', price: 120, cost_price: 90, stock: 24, barcode: 'NAI777001' }],
      ['chini 1kg product banao', { name: 'Chini 1kg' }],
    ])('%s', (text, input) => {
      expect(ruleActionPlan(text)).toEqual([{ name: 'propose_create_product', input }]);
    });
  });

  describe('rules parser: customers, expenses, khata payments, refusals', () => {
    it('customer', () => {
      expect(ruleActionPlan('Ali Khan customer add karo 03001234567')).toEqual([{ name: 'propose_create_customer', input: { name: 'Ali Khan', phone: '03001234567' } }]);
      expect(ruleActionPlan('naya customer bilal ahmed 0321-1234567')).toEqual([{ name: 'propose_create_customer', input: { name: 'Bilal Ahmed', phone: '03211234567' } }]);
    });
    it('expense', () => {
      expect(ruleActionPlan('500 ka bijli ka expense likho')).toEqual([{ name: 'propose_expense', input: { title: 'Bijli', amount: 500 } }]);
      expect(ruleActionPlan('kharcha chai pani 300')).toEqual([{ name: 'propose_expense', input: { title: 'Chai Pani', amount: 300 } }]);
    });
    it('khata payment', () => {
      expect(ruleActionPlan('Hamza se 2000 wapas aaye khata me')).toEqual([{ name: 'propose_khata_payment', input: { customer: 'hamza', amount: 2000 } }]);
      expect(ruleActionPlan('hamza sheikh se 2150 wasool jazzcash')).toEqual([{ name: 'propose_khata_payment', input: { customer: 'hamza sheikh', amount: 2150, payment_method: 'jazzcash' } }]);
    });
    it('refuses deletes and leaves questions alone', () => {
      expect(ruleActionPlan('is customer ko delete kar do')?.[0]).toMatchObject({ name: 'open_page', input: { _refuse: true } });
      expect(ruleActionPlan('aaj ki sale kitni hai?')).toBeNull();
      expect(ruleToolPlan('Meri sale barhane ke liye kya karun?')).toEqual([]);
      expect(ruleToolPlan('kal ki sale kitni thi?')).toEqual([{ name: 'sales_summary', input: { period: 'yesterday' } }]);
    });
  });

  it('hides the follow-up tail while streaming, even split across chunks', () => {
    const f = new FollowupFilter();
    const shown = ['Sale **Rs 4,590** rahi.\n', '<<follo', 'wups: Kal se compare karo | Kya mangwana ', 'hai?>>'].map((c) => f.push(c)).join('');
    const done = f.finish();
    expect((shown + done.leftover).trimEnd()).toBe('Sale **Rs 4,590** rahi.');
    expect(shown).not.toContain('<<');
    expect(done.suggestions).toEqual(['Kal se compare karo', 'Kya mangwana hai?']);
  });

  it('writes hours in 12-hour shop style', () => {
    expect(hourRange(0, 'roman')).toBe('12–1 baje raat');
    expect(hourRange(20, 'roman')).toBe('8–9 baje shaam');
    expect(hourRange(20, 'en')).toBe('8–9 PM');
    expect(hourRange(11, 'en')).toBe('11 AM–12 PM');
  });

  it('gives templated follow-ups per answer type', () => {
    expect(suggestionsFor(['profit_summary'], 'roman')).toHaveLength(3);
    expect(suggestionsFor(['propose_sale'], 'en')[0]).toMatch(/sales/);
  });
});
