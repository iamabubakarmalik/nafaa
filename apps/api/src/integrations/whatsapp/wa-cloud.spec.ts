import {
  confirmPayload, costEstimate, orderValues, parseButtonPayload, parseWaWebhook, replyResult, templateCreatePayload, templateDraft, templateSendPayload, toMetaBody,
  waNumber,
} from './wa-cloud';

describe('WhatsApp Cloud helpers', () => {
  it('turns shop placeholders into numbered variables', () => {
    expect(toMetaBody('Salam {name}! Order #{no} ka total {total} hai.')).toEqual({ body: 'Salam {{1}}! Order #{{2}} ka total {{3}} hai.', params: ['name', 'no', 'total'] });
    expect(toMetaBody('{name} ji, cart: {cartUrl}')).toEqual({ body: 'Assalam o Alaikum, {{1}} ji, cart: {{2}}.', params: ['name', 'cartUrl'] });
    expect(toMetaBody('Hello {unknown}  there').body).toBe('Hello there');
  });

  it('builds the confirmation template with two quick reply buttons', () => {
    const d = templateDraft('confirm', null);
    const p = templateCreatePayload(d);
    expect(p).toMatchObject({ name: 'nafaa_order_confirm', category: 'UTILITY', language: 'en' });
    expect(p.components[0].example.body_text[0][0]).toBe('Ayesha');
    expect(p.components[1]).toEqual({ type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Haan confirm' }, { type: 'QUICK_REPLY', text: 'Cancel' }] });
    expect(templateCreatePayload(templateDraft('cart', 'Cart {cartUrl} tayyar hai')).category).toBe('MARKETING');
    expect(templateCreatePayload(templateDraft('delivered', 'Shukriya!')).components).toEqual([{ type: 'BODY', text: 'Shukriya!' }]);
  });

  it('builds a template send with order button payloads', () => {
    const p = templateSendPayload('923001234567', { name: 'nafaa_order_confirm', language: 'en' }, ['Ali', ''], [confirmPayload('ord_123456', 'yes'), confirmPayload('ord_123456', 'no')]);
    expect(p.template.components).toEqual([
      { type: 'body', parameters: [{ type: 'text', text: 'Ali' }, { type: 'text', text: '-' }] },
      { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: 'nafaa:yes:ord_123456' }] },
      { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: 'nafaa:no:ord_123456' }] },
    ]);
  });

  it('normalises Pakistani numbers', () => {
    expect(waNumber('0300-1234567')).toBe('923001234567');
    expect(waNumber('+92 300 1234567')).toBe('923001234567');
    expect(waNumber('3001234567')).toBe('923001234567');
    expect(waNumber('12345')).toBeNull();
  });

  it('maps a button reply to the order confirmation', () => {
    const body = {
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ field: 'messages', value: {
        metadata: { phone_number_id: 'PN1' },
        contacts: [{ wa_id: '923001234567', profile: { name: 'Ali' } }],
        messages: [
          { id: 'wamid.1', from: '923001234567', timestamp: '1762650000', type: 'button', context: { id: 'wamid.out' }, button: { payload: 'nafaa:yes:ord_123456', text: 'Haan confirm' } },
          { id: 'wamid.2', from: '923001234567', timestamp: '1762650001', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'nafaa:no:ord_654321', title: 'Cancel' } } },
          { id: 'wamid.3', from: '923001234567', timestamp: '1762650002', type: 'text', text: { body: 'Address badalna hai' } },
        ],
        statuses: [{ id: 'wamid.out', status: 'read', recipient_id: '923001234567', timestamp: '1762650003', pricing: { category: 'utility', billable: true } }],
      } }] }],
    };
    const { inbound, statuses } = parseWaWebhook(body);
    expect(inbound).toHaveLength(3);
    expect(inbound[0]).toMatchObject({ phoneNumberId: 'PN1', name: 'Ali', contextId: 'wamid.out', text: 'Haan confirm' });
    expect(replyResult(inbound[0])).toEqual({ orderId: 'ord_123456', result: 'CONFIRMED' });
    expect(replyResult(inbound[1])).toEqual({ orderId: 'ord_654321', result: 'REFUSED' });
    expect(replyResult(inbound[2])).toBeNull();
    expect(inbound[2].text).toBe('Address badalna hai');
    expect(statuses[0]).toMatchObject({ messageId: 'wamid.out', status: 'READ', category: 'UTILITY', billable: true });
    expect(parseButtonPayload('nafaa:maybe:ord_123456')).toBeNull();
    expect(parseWaWebhook({ object: 'page' }).inbound).toEqual([]);
  });

  it('reads template status updates', () => {
    const { templates } = parseWaWebhook({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'message_template_status_update', value: { event: 'REJECTED', message_template_id: 77, message_template_name: 'nafaa_order_confirm', reason: 'INVALID_FORMAT' } }] }] });
    expect(templates).toEqual([{ templateId: '77', name: 'nafaa_order_confirm', language: null, event: 'REJECTED', reason: 'INVALID_FORMAT' }]);
  });

  it('fills order values', () => {
    const v = orderValues({ externalOrderId: '55', externalOrderNumber: '#1042', customerName: 'Ali Khan', customerAddress: null, customerCity: 'Lahore', items: [{ name: 'Lawn', quantity: 2 }], total: '3450', courierName: 'TCS', trackingNumber: '77' }, 'Shop', 3450);
    expect(v).toMatchObject({ name: 'Ali', no: '1042', items: '2 × Lawn', total: 'Rs 3,450', cod: 'Rs 3,450', city: 'Lahore', tracking: '77' });
  });

  it('estimates the monthly cost', () => {
    const c = costEstimate({ confirm: 100, dispatched: 100, cart: 10 }, 280);
    expect(c.usd).toBe(1.55);
    expect(c.pkr).toBe(435);
  });
});
