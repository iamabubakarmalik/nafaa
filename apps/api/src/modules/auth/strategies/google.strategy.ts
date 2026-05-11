import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly config: ConfigService) {
    const apiUrl = config.get<string>('API_URL') || 'http://localhost:4000/api';
    const callbackURL = `${apiUrl.replace(/\/$/, '')}/auth/google/callback`;

    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'missing-client-id',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'missing-secret',
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, name, photos } = profile;
    done(null, {
      googleId: id,
      email: emails?.[0]?.value,
      fullName: `${name?.givenName ?? ''} ${name?.familyName ?? ''}`.trim() || emails?.[0]?.value,
      avatarUrl: photos?.[0]?.value,
    });
  }
}
