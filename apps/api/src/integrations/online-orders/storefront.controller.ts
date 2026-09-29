import { Body, Controller, Get, Header, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
  catalog(@Param('key') key: string) {
    return this.svc.publicCatalog(key);
  }

  @Post('form/:key/order')
  @HttpCode(200)
  // Spam se bachao: ek IP se 1 minute me 5 order
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Order form se order (COD)' })
  order(@Param('key') key: string, @Body() body: any) {
    return this.svc.publicOrder(key, body);
  }

  @Get('embed.js')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  embed() {
    return embedScript(this.svc.webBase());
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
  window.NafaaOrder={open:open,close:close};
})();`;
}
