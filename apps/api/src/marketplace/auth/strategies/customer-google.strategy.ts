import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class CustomerGoogleStrategy extends PassportStrategy(Strategy, 'customer-google') {
  private readonly logger = new Logger(CustomerGoogleStrategy.name);

  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') ?? '',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') ?? '',
      callbackURL:
        config.get<string>('GOOGLE_CUSTOMER_CALLBACK_URL') ??
        'http://localhost:4000/api/marketplace/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    const user = {
      googleId: id,
      email: emails?.[0]?.value,
      emailVerified: emails?.[0]?.verified ?? false,
      firstName: name?.givenName ?? '',
      lastName: name?.familyName ?? '',
      fullName: `${name?.givenName ?? ''} ${name?.familyName ?? ''}`.trim(),
      avatarUrl: photos?.[0]?.value,
    };
    done(null, user);
  }
}
