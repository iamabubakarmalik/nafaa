/**
 * Exception filter for the CMS controllers.
 *
 * The global filter keeps only `message` and `error`, which would drop the
 * extra fields the API contract promises: `issues` (422), `current` (409),
 * `duplicateOf` (media 409) and `errors` (400). This filter keeps the whole
 * HttpException body and hands every other error to the global filter, so
 * database errors still never reach the client.
 *
 * Use with `@UseFilters(CmsExceptionFilter)` on a CMS controller.
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { GlobalExceptionFilter } from '../../../common/filters/global-exception.filter';

@Catch()
export class CmsExceptionFilter implements ExceptionFilter {
  private readonly fallback = new GlobalExceptionFilter();

  catch(exception: unknown, host: ArgumentsHost): void {
    if (!(exception instanceof HttpException)) {
      this.fallback.catch(exception, host);
      return;
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    if (response.headersSent) return;

    const status = exception.getStatus();
    const body = exception.getResponse();
    const extra = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : { message: body };
    response.status(status).json({
      success: false,
      ...extra,
      statusCode: status,
      error: typeof extra.error === 'string' ? extra.error : exception.name,
      message: extra.message ?? exception.message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
