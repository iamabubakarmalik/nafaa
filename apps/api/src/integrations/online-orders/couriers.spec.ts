import { API_SOON, COURIERS, courierLink, courierTrackUrl } from './couriers';
import { COURIER_APIS } from './courier-api/registry';
import { trackingInfo } from './channel-status-map';

describe('courier list and tracking links', () => {
  it('puts the CN into the courier tracking page', () => {
    expect(courierTrackUrl('BLUE_EX', '5027729334')).toBe('https://www.blue-ex.com/tracking?trackno=5027729334');
    expect(courierTrackUrl('DAEWOO', 'FX 12')).toBe('https://fastex.pk/trackingDetail?trackingNo=FX%2012');
    expect(courierTrackUrl('TPL_RIDER', '1234567')).toBe('https://track.withrider.com/#/track/1234567');
    expect(courierTrackUrl('BARQRAFTAR', '3548741255')).toBe('https://barqraftar.pk/track?tracking_number=3548741255');
    expect(courierTrackUrl('ZOOM', 'Z1')).toBe('https://portal.zoomcod.com/track-details.php?track_code=Z1');
    expect(courierTrackUrl('PAKPOST', 'VPL1')).toBe('https://ep.gov.pk/emtts/EPTrack_Live.aspx?ArticleIDz=VPL1');
  });

  it('gives no link without a CN or a known page', () => {
    expect(courierTrackUrl('BLUE_EX', '  ')).toBeNull();
    expect(courierTrackUrl('TRANZO', '123')).toBeNull();
    expect(courierTrackUrl(null, '123')).toBeNull();
  });

  it('falls back to the courier home page', () => {
    expect(courierLink('TRANZO', '123')).toBe('https://tranzo.pk');
    expect(courierLink('BLUE_EX', null)).toBe('https://www.blue-ex.com');
    expect(courierLink('SWYFT', '1')).toBeNull();
    expect(courierLink('NOPE', '1')).toBeNull();
  });

  it('sends the tracking link to sales channels', () => {
    expect(trackingInfo({ courierCode: 'DAEWOO', trackingNumber: 'D1' })).toEqual({ company: 'Daewoo FastEx', number: 'D1', url: 'https://fastex.pk/trackingDetail?trackingNo=D1' });
    expect(trackingInfo({ courierCode: 'MOVEX', trackingNumber: 'M1' })).toEqual({ company: 'MoveX', number: 'M1' });
  });

  it('lists every "coming soon" courier as a manual courier without an adapter', () => {
    const codes = new Set<string>(COURIERS.map((c) => c.code));
    for (const code of API_SOON) {
      expect(codes.has(code)).toBe(true);
      expect(COURIER_APIS[code]).toBeUndefined();
    }
    expect(new Set(COURIERS.map((c) => c.code)).size).toBe(COURIERS.length);
  });
});
