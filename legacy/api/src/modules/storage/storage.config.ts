import { requireEnv } from 'src/config/env.util';

export interface StorageConfig {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  useSSL: boolean;
  bucket: string;
  region?: string;
  publicUrl?: string;
  provider: 'aws' | 'minio' | 'supabase';
}

const provider = (process.env.STORAGE_PROVIDER ||
  'minio') as StorageConfig['provider'];

export const storageConfig: StorageConfig = {
  endpoint: requireEnv(
    'STORAGE_ENDPOINT',
    provider === 'aws' ? 's3.amazonaws.com' : 'localhost',
  ),
  port: parseInt(
    requireEnv('STORAGE_PORT', provider === 'aws' ? '443' : '9000'),
    10,
  ),
  accessKey: requireEnv('STORAGE_ACCESS_KEY', provider === 'aws' ? '' : 'test'),
  secretKey: requireEnv('STORAGE_SECRET_KEY', provider === 'aws' ? '' : 'test'),
  useSSL: provider === 'aws' ? true : process.env.STORAGE_USE_SSL === 'true',
  bucket: requireEnv('STORAGE_BUCKET', 'frame24-uploads'),
  region:
    process.env.STORAGE_REGION ||
    (provider === 'aws' ? 'us-east-1' : undefined),
  publicUrl: process.env.STORAGE_PUBLIC_URL,
  provider,
};
