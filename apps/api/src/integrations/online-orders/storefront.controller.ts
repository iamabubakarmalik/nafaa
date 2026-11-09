import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { FormConfig, StorefrontService } from './storefront.service';

// ═══════════════════════════════════════════════════════════════
// PUBLIC — order form, Buy button script, developer link
// ═══════════════════════════════════════════════════════════════
@ApiTags('Website API (public)')
@Public()
@Controller('integrations/website/v1')
export class StorefrontPublicController {
  constructor(private readonly svc: StorefrontService) {}

  @Get('form/:key')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Order form: dukaan ka naam + products (qeemat Nafaa se)' })
  catalog(@Param('key') key: string, @Query('product') product?: string) {
    return this.svc.publicCatalog(key, product);
  }

  @Post('form/:key/order')
  @HttpCode(200)
  // Spam se bachao: ek IP se 1 minute me 5 order
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Order form se order (COD)' })
  order(@Param('key') key: string, @Body() body: any) {
    return this.svc.publicOrder(key, body);
  }

  @Get('form/:key/prices')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Order form: ek mulk ki qeemat (international)' })
  prices(@Param('key') key: string, @Query('country') country?: string) {
    return this.svc.publicIntlPrices(key, String(country ?? ''));
  }

  @Post('form/:key/coupon')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  coupon(@Param('key') key: string, @Body() body: { code?: string; subtotal?: number; phone?: string }) {
    return this.svc.checkCoupon(key, body ?? {});
  }

  @Get('form/:key/track')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Customer: order ka haal (order # + phone ke aakhri 4)' })
  track(@Param('key') key: string, @Query('no') no?: string, @Query('phone') phone?: string) {
    return this.svc.track(key, { no, phone });
  }

  @Get('embed.js')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  embed(@Res() res: Response) {
    // @Res se seedha — warna global ResponseInterceptor script ko JSON me lapet deta
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(embedScript(this.svc.webBase()));
  }

  @Get('dev/:token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  invite(@Param('token') token: string) {
    return this.svc.inviteInfo(token);
  }

  @Post('dev/:token/test')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  inviteTest(@Param('token') token: string) {
    return this.svc.inviteTest(token);
  }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN — channel ke andar form settings + developer invite
// ═══════════════════════════════════════════════════════════════
@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-store/channels/:id')
export class StorefrontAdminController {
  constructor(private readonly svc: StorefrontService) {}

  @Get('form')
  form(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.formSettings(user, id);
  }

  @Patch('form')
  updateForm(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: Partial<FormConfig> & { regenerate?: boolean }) {
    return this.svc.updateForm(user, id, body ?? {});
  }

  @Post('dev-invite')
  @ApiOperation({ summary: 'Developer ke liye 7 din ka setup link' })
  invite(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.createInvite(user, id);
  }
}

/**
 * Buy button script — kisi bhi website par ek line:
 *   <script src=".../embed.js" data-nafaa="f_xxx" defer></script>
 * Phir koi bhi element: <button data-nafaa-buy="SKU">Order</button>
 * (SKU khali = poora form). data-floating="1" = kone me "Order karein" button.
 */
function embedScript(web: string) {
  return `(function(){
  var s=document.currentScript||document.querySelector('script[data-nafaa]');
  if(!s)return;var key=s.getAttribute('data-nafaa');if(!key)return;
  var WEB=${JSON.stringify(web)};var ov=null;
  function close(){if(ov){ov.remove();ov=null;document.body.style.overflow='';}}
  function open(sku){
    close();ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:2147483646;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:12px';
    var f=document.createElement('iframe');
    f.src=WEB+'/order/'+encodeURIComponent(key)+'?embed=1'+(sku?'&sku='+encodeURIComponent(sku):'');
    f.title='Order';f.allow='clipboard-write';
    f.style.cssText='width:100%;max-width:520px;height:min(92vh,760px);border:0;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.3)';
    ov.appendChild(f);ov.addEventListener('click',function(e){if(e.target===ov)close();});
    document.body.appendChild(ov);document.body.style.overflow='hidden';
  }
  window.addEventListener('message',function(e){if(e.origin===WEB&&e.data==='nafaa:close')close();});
  document.addEventListener('click',function(e){
    var el=e.target&&e.target.closest?e.target.closest('[data-nafaa-buy]'):null;
    if(!el)return;e.preventDefault();open(el.getAttribute('data-nafaa-buy')||'');
  });
  if(s.getAttribute('data-floating')==='1'){
    var b=document.createElement('button');b.type='button';b.textContent=s.getAttribute('data-label')||'Order karein';
    b.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483645;background:#059669;color:#fff;border:0;border-radius:999px;padding:14px 20px;font:600 15px system-ui,sans-serif;box-shadow:0 8px 24px rgba(5,150,105,.4);cursor:pointer';
    b.onclick=function(){open('');};
    (document.body?Promise.resolve():new Promise(function(r){document.addEventListener('DOMContentLoaded',r);})).then(function(){document.body.appendChild(b);});
  }
  // "Customers also bought": <div data-nafaa-together="SKU"></div> fills with up to 4 products bought with it.
  var API=(s.src||'').split('/embed.js')[0];
  function money(n){try{return 'Rs '+Math.round(n).toLocaleString('en-PK');}catch(e){return 'Rs '+Math.round(n);}}
  function together(el){
    if(!API||el.getAttribute('data-nafaa-done'))return;el.setAttribute('data-nafaa-done','1');
    var sku=el.getAttribute('data-nafaa-together')||'';if(!sku)return;
    fetch(API+'/form/'+encodeURIComponent(key)+'/together?sku='+encodeURIComponent(sku)+'&limit='+(el.getAttribute('data-limit')||'4'))
      .then(function(r){return r.ok?r.json():null;}).then(function(j){
        var items=j&&(j.data||j).items;if(!items||!items.length)return;
        var h=document.createElement('div');h.textContent=el.getAttribute('data-title')||'Saath me ye bhi liya jata hai';
        h.style.cssText='font:600 15px system-ui,sans-serif;margin:0 0 10px;color:#0f172a';el.appendChild(h);
        var g=document.createElement('div');g.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px';
        items.forEach(function(p){
          var c=document.createElement('div');c.style.cssText='border:1px solid #e2e8f0;border-radius:12px;padding:8px;font:13px system-ui,sans-serif;background:#fff';
          if(p.image){var im=document.createElement('img');im.src=p.image;im.alt='';im.loading='lazy';im.style.cssText='width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px';c.appendChild(im);}
          var n=document.createElement('div');n.textContent=p.name;n.style.cssText='margin-top:6px;color:#0f172a;line-height:1.3';c.appendChild(n);
          var pr=document.createElement('div');pr.textContent=money(p.price);pr.style.cssText='font-weight:700;margin-top:2px;color:#0f172a';c.appendChild(pr);
          var b=document.createElement('button');b.type='button';b.textContent=el.getAttribute('data-button')||'Order karein';
          b.style.cssText='margin-top:6px;width:100%;background:#059669;color:#fff;border:0;border-radius:8px;padding:7px;font:600 13px system-ui,sans-serif;cursor:pointer';
          b.onclick=function(){open(p.sku||'');};c.appendChild(b);g.appendChild(c);
        });
        el.appendChild(g);
      }).catch(function(){});
  }
  function scan(){var l=document.querySelectorAll('[data-nafaa-together]');for(var i=0;i<l.length;i++)together(l[i]);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
  window.NafaaOrder={open:open,close:close,together:scan};
})();`;
}
