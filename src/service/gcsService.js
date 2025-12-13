import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';

dotenv.config();

class GcsService {
  constructor() {
    const gcsConfig = {
      projectId: process.env.GCS_PROJECT_ID || 'oauth2-extension-477302',
      credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }
    };

    this.storage = new Storage(gcsConfig);
    this.bucketName = process.env.GCS_BUCKET_NAME;
    
    if (!this.bucketName) {
      throw new Error('GCS_BUCKET_NAME environment variable is required');
    }

    this.bucket = this.storage.bucket(this.bucketName);
  }

  async uploadImage(prefix, file, fileName) {
    try {
      const fileKey = `${prefix}/${fileName}`;
      const fileUpload = this.bucket.file(fileKey);

      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });

      return fileKey;
    } catch (error) {
      throw new Error(`Failed to upload to GCS: ${error.message}`);
    }
  }

  async getPresignedUrl(fileKey, expiresIn = 3600) {
    try {
      const file = this.bucket.file(fileKey);
      
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresIn * 1000,
      });

      return signedUrl;
    } catch (error) {
      return null;
    }
  }
}

const gcsService = new GcsService();

export default gcsService;
