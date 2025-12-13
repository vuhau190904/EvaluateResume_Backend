import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

class AuthService {
  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
  }

  createGoogleAuthUrl() {
    try {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.scopes,
        prompt: 'consent',
        state: uuidv4()
      });
      return authUrl;
    } catch (error) {
      throw new Error('Failed to create Google Auth URL');
    }
  }

  async exchangeCodeForToken(code) {
    try {
      if (!code) {
        throw new Error('Authorization code is required');
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens || !tokens.id_token) {
        throw new Error('Failed to get tokens from Google');
      }

      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();

      const userInfo = {
        email: payload.email,
        picture: payload.picture,
      };

      return { userInfo };

    } catch (error) {      
      if (error.message.includes('invalid_grant')) {
        throw new Error('Authorization code is invalid or expired');
      }
      
      throw new Error(`Failed to authenticate with Google: ${error.message}`);
    }
  }

  async generateServiceToken() {
    try {
      const token = uuidv4();
      return token;
    } catch (error) {
      throw new Error('Failed to generate service token');
    }
  }
}

// Tạo instance singleton
const authService = new AuthService();

export default authService;

