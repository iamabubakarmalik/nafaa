/**
 * Signed preview links (API-CONTRACT 7). The admin asks for a link; the
 * public preview endpoint (A2, `GET /public/site/preview`) calls `verify`.
 *
 * Secret: CMS_PREVIEW_SECRET. Outside production a secret derived from
 * JWT_ACCESS_SECRET is used when it is missing, so local previews work
 * without extra setup; production refuses to sign without it.
 */
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { DEFAULT_LOCALE, PREVIEW, type PreviewLinkResponse } from '../contract/cms-contract';
import { CmsPathService } from '../paths/cms-path.service';
import { localizedPath } from '../paths/cms-paths';
import { signPreviewToken, verifyPreviewToken } from './preview-token';

/** Local site dev server (apps/site `pnpm dev`). */
const LOCAL_SITE_URL = 'http://localhost:3200';

export interface VerifiedPreview {
  entryId: string;
  expiresAt: string;
}

@Injectable()
export class CmsPreviewService {
  constructor(private readonly paths: CmsPathService) {}

  private secret(): string | null {
    const own = process.env.CMS_PREVIEW_SECRET?.trim();
    if (own) return own;
    if (process.env.NODE_ENV === 'production') return null;
    const base = process.env.JWT_ACCESS_SECRET ?? 'nafaa-local';
    return createHash('sha256').update(`cms-preview:${base}`).digest('hex');
  }

  /** Where preview links point: SITE_PREVIEW_URL, then SITE_PUBLIC_URL, then the local site outside production. */
  async previewBaseUrl(): Promise<string> {
    const explicit = process.env.SITE_PREVIEW_URL?.trim() || process.env.SITE_PUBLIC_URL?.trim();
    if (explicit) return explicit.replace(/\/+$/, '');
    if (process.env.NODE_ENV !== 'production') return LOCAL_SITE_URL;
    return this.paths.siteUrl();
  }

  async createLink(entry: { id: string; locale: string; path: string }, expiresInHours?: number): Promise<PreviewLinkResponse> {
    const secret = this.secret();
    if (!secret) throw new ServiceUnavailableException('CMS_PREVIEW_SECRET set nahi, preview link nahi ban sakta');
    const hours = Math.min(PREVIEW.maxHours, Math.max(PREVIEW.minHours, expiresInHours ?? PREVIEW.defaultHours));
    const exp = Math.floor(Date.now() / 1000) + hours * 3600;
    const token = signPreviewToken(secret, { sub: entry.id, scope: PREVIEW.tokenScope, exp });
    const base = await this.previewBaseUrl();
    const path = localizedPath(entry.locale || DEFAULT_LOCALE, entry.path);
    const url = `${base}${PREVIEW.sitePreviewPath}?token=${encodeURIComponent(token)}&path=${encodeURIComponent(path)}`;
    return { url, expiresAt: new Date(exp * 1000).toISOString() };
  }

  /** Checks a token; null when invalid or expired (the caller answers 401). */
  verify(token: string): VerifiedPreview | null {
    const secret = this.secret();
    if (!secret) return null;
    const claims = verifyPreviewToken(secret, token);
    return claims ? { entryId: claims.sub, expiresAt: new Date(claims.exp * 1000).toISOString() } : null;
  }
}
