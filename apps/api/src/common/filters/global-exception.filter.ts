import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

/** Plain answers for database errors the client can act on. */
const PRISMA_KNOWN: Record<string, { status: number; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'Ye record pehle se mojood hai' },
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'Ye record kisi aur record se juda hai ya link ghalat hai' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Record nahi mila' },
  P2000: { status: HttpStatus.BAD_REQUEST, message: 'Koi field had se lambi hai' },
  P2006: { status: HttpStatus.BAD_REQUEST, message: 'Kisi field ki value ghalat hai' },
  P2011: { status: HttpStatus.BAD_REQUEST, message: 'Koi zaroori field khali hai' },
  P2023: { status: HttpStatus.BAD_REQUEST, message: 'Kisi field ki value ghalat hai' },
};

const SERVER_ERROR_MESSAGE = 'Server me masla aa gaya. Thori der baad dobara try karein.';

/**
 * HttpExceptions keep their own status and message. Anything else (Prisma,
 * runtime errors) is logged in full on the server and answered with a plain
 * message, so database text, table names and file paths never reach the client.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = SERVER_ERROR_MESSAGE;
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r.message as string | string[]) ?? message;
        error = (r.error as string) ?? exception.name;
      }
    } else {
      const where = `${request.method} ${request.originalUrl ?? request.url}`;
      if (exception instanceof Prisma.PrismaClientKnownRequestError && PRISMA_KNOWN[exception.code]) {
        const known = PRISMA_KNOWN[exception.code];
        status = known.status;
        message = known.message;
        error = HttpStatus[status] ?? 'Error';
        this.logger.warn(`${where} → ${exception.code}: ${exception.message}`);
      } else if (exception instanceof Prisma.PrismaClientValidationError) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Bheja gaya data durust nahi';
        error = 'BadRequest';
        this.logger.error(`${where} → ${exception.message}`);
      } else if (exception instanceof Error) {
        this.logger.error(`${where} → ${exception.stack ?? exception.message}`);
      } else {
        this.logger.error(`${where} → ${String(exception)}`);
      }
    }

    if (response.headersSent) return;
    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
