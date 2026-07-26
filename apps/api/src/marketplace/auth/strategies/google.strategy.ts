import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private config: ConfigService) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID') || 'dummy',
      clientSecret: config.get('GOOGLE_CLIENT_SECRET') || 'dummy',
      callbackURL: config.get('GOOGLE_CALLBACK_URL') || 'http://localhost:4000/api/marketplace/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { emails, name, photos, id } = profile;
    done(null, {
      googleId: id,
      email: emails?.[0]?.value,
      fullName: `${name?.givenName || ''} ${name?.familyName || ''}`.trim(),
      avatarUrl: photos?.[0]?.value,
      accessToken,
    });
  }
}
