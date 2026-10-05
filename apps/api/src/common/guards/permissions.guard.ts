import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import {
  hasPermission,
  type PermissionKey,
} from '../constants/permissions.constants';
import { permissionForRoute } from '../constants/permission-routes';

/* ═════════════════════════════════════════════════════════════
   IJAZAT KA PEHREDAAR
   ─────────────────────────────────────────────────────────────
   Pehle ye guard mojood tha magar kahin laga hua nahi tha — yani
   UI me button chhupana mehaz dikhawa tha. Jis cashier se products
   ka access le liya jata, wo bhi seedha API par ja kar maal badal
   sakta tha.

   Ab ye poori app par lagta hai aur do jagah se faisla leta hai:

     1. Controller par laga `@RequirePermissions` — ye hamesha
        jeetta hai
     2. Warna raaste ka naqsha (`permission-routes.ts`)

   Jahan dono khamosh hon wahan raasta khula rehta hai. Ye jaan
   boojh kar hai: Nafaa par chalti hui dukaanein hain, aur sab
   anjaan raaste band kar dene ka matlab hota subah kisi ki dukaan
   ka ruk jana.
   ═════════════════════════════════════════════════════════════ */

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger('Permissions');

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    /* Login se pehle wale raaste — JwtAuthGuard khud sambhalta hai */
    if (!user) return true;

    const explicit =
      this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    /* Decorator ki list me SAB chahiye; raaste ki list me KOI EK.
       Wajah: decorator khaas hifazat ke liye lagta hai, jabke raaste
       ka naqsha "ye kaam kis haisiyat se hota hai" batata hai — aur
       ek kaam kai haisiyaton se ho sakta hai. Jaise maal parhna:
       Products wala bhi parhta hai aur counter wala bhi. */
    const fromPath = permissionForRoute(
      request.method ?? 'GET',
      request.route?.path ?? request.url ?? '',
    );

    const required: PermissionKey[] = explicit.length > 0 ? explicit : (fromPath ?? []);
    if (required.length === 0) return true;

    const anyOf = explicit.length === 0 && (fromPath?.length ?? 0) > 1;
    const ok = anyOf
      ? required.some((perm) => hasPermission(user.role, user.permissions, perm))
      : required.every((perm) => hasPermission(user.role, user.permissions, perm));

    if (!ok) {
      const missing = required.filter(
        (perm) => !hasPermission(user.role, user.permissions, perm),
      );
      /* Dukaan-daar ko Roman Urdu me, taake support par sawal na aaye.
         Log me poora raasta, taake hum dekh sakein ke kya ruk raha hai. */
      this.logger.warn(
        `${user.email ?? user.id} → ${request.method} ${request.url} — chahiye: ${missing.join(anyOf ? ' YA ' : ', ')}`,
      );
      throw new ForbiddenException(
        'Is kaam ki ijazat aap ke paas nahi — dukaan ke malik se kehein ke de dein',
      );
    }

    return true;
  }
}
