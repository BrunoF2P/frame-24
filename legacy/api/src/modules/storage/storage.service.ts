import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { storageConfig } from './storage.config';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;

  constructor(private readonly cls: ClsService) {
    const protocol = storageConfig.useSSL ? 'https' : 'http';
    const port = storageConfig.port;

    const isSupabase = storageConfig.endpoint.includes('supabase.co');
    const isAWS = storageConfig.provider === 'aws';
    const endpointPath = isSupabase ? '/storage/v1/s3' : '';
    const isStandardPort =
      (storageConfig.useSSL && port === 443) ||
      (!storageConfig.useSSL && port === 80);
    const portStr = isStandardPort ? '' : `:${port}`;

    const endpoint = isAWS
      ? undefined
      : `${protocol}://${storageConfig.endpoint}${portStr}${endpointPath}`;

    this.s3Client = new S3Client({
      ...(endpoint ? { endpoint } : {}),
      region: storageConfig.region || 'us-east-1',
      credentials: {
        accessKeyId: storageConfig.accessKey,
        secretAccessKey: storageConfig.secretKey,
      },
      forcePathStyle: !isAWS,
    });

    this.logger.log(
      `Storage client initialized (provider=${storageConfig.provider})`,
    );
  }

  async onModuleInit() {
    try {
      await this.ensureBucket();
    } catch (error: unknown) {
      this.logger.warn(
        `Storage is not available: ${this.getErrorMessage(error)}. File uploads will fail until storage is configured.`,
      );
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private isBucketNotFoundError(error: unknown): boolean {
    const maybeS3Error = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    return (
      maybeS3Error?.name === 'NotFound' ||
      maybeS3Error?.$metadata?.httpStatusCode === 404
    );
  }

  /**
   * Ensures the bucket exists, creates it if not (MinIO only)
   *
   * Note: Supabase Storage requires buckets to be created manually via dashboard.
   * This method will only attempt to create buckets in local MinIO environments.
   */
  private async ensureBucket(): Promise<void> {
    try {
      await this.s3Client.send(
        new HeadBucketCommand({ Bucket: storageConfig.bucket }),
      );
      this.logger.log(`Bucket ${storageConfig.bucket} is accessible`);
    } catch (error: unknown) {
      const errorMessage = this.getErrorMessage(error);
      if (this.isBucketNotFoundError(error)) {
        const canCreate =
          storageConfig.provider === 'minio' ||
          storageConfig.endpoint === 'localhost' ||
          storageConfig.endpoint === 'minio' ||
          storageConfig.endpoint.includes('127.0.0.1');

        if (canCreate) {
          try {
            await this.s3Client.send(
              new CreateBucketCommand({ Bucket: storageConfig.bucket }),
            );
            this.logger.log(
              `Bucket ${storageConfig.bucket} created successfully`,
            );
          } catch (createError: unknown) {
            this.logger.warn(
              `Could not create bucket ${storageConfig.bucket}: ${this.getErrorMessage(createError)}`,
            );
          }
        } else {
          this.logger.warn(
            `Bucket ${storageConfig.bucket} does not exist. ` +
              `For AWS S3, create the bucket manually in the AWS Console. ` +
              `File uploads will fail until the bucket is created.`,
          );
        }
      } else {
        this.logger.warn(
          `Unable to verify bucket ${storageConfig.bucket}: ${errorMessage}`,
        );
      }
    }
  }

  /**
   * Uploads a file to S3-compatible storage
   * @param file - The file to upload
   * @param folder - The folder/module name (e.g., 'products', 'employees')
   * @returns The public URL of the uploaded file
   */
  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const companyId = this.cls.get<string>('companyId') || 'default';
    const timestamp = Date.now();
    const uuid = randomUUID();
    const extension = file.originalname.split('.').pop();
    const objectKey = `${companyId}/${folder}/${timestamp}-${uuid}.${extension}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: storageConfig.bucket,
          Key: objectKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      this.logger.log(`File uploaded successfully: ${objectKey}`);

      // Return the public URL
      return this.getPublicUrl(objectKey);
    } catch (error: unknown) {
      this.logger.error(`Error uploading file: ${this.getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Deletes a file from S3-compatible storage
   * @param fileUrl - The full URL or object key
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    try {
      // Extract object key from URL
      const objectKey = this.extractObjectKey(fileUrl);
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: storageConfig.bucket,
          Key: objectKey,
        }),
      );
      this.logger.log(`File deleted successfully: ${objectKey}`);
    } catch (error: unknown) {
      this.logger.error(`Error deleting file: ${this.getErrorMessage(error)}`);
      // Don't throw - deletion failures shouldn't break the flow
    }
  }

  /**
   * Gets a presigned URL for temporary access
   * @param objectKey - The object key in S3
   * @param expirySeconds - Expiry time in seconds (default: 1 hour)
   */
  async getPresignedUrl(
    objectKey: string,
    expirySeconds = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: storageConfig.bucket,
        Key: objectKey,
      });
      return await getSignedUrl(this.s3Client, command, {
        expiresIn: expirySeconds,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Error generating presigned URL: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Constructs the public URL for an object
   *
   * Works with:
   * - Minio: http://localhost:9000/bucket/object
   * - Supabase: https://[project].supabase.co/storage/v1/object/public/bucket/object
   *
   * Set STORAGE_PUBLIC_URL in env to override URL generation
   */
  private getPublicUrl(objectKey: string): string {
    if (storageConfig.publicUrl) {
      const baseUrl = storageConfig.publicUrl.replace(/\/$/, '');
      const path = objectKey.replace(/^\//, '');
      return `${baseUrl}/${storageConfig.bucket}/${path}`;
    }

    if (storageConfig.provider === 'aws') {
      return `https://${storageConfig.bucket}.s3.${storageConfig.region || 'us-east-1'}.amazonaws.com/${objectKey}`;
    }

    const protocol = storageConfig.useSSL ? 'https' : 'http';
    const isStandardPort =
      (storageConfig.useSSL && storageConfig.port === 443) ||
      (!storageConfig.useSSL && storageConfig.port === 80);
    const portStr = isStandardPort ? '' : `:${storageConfig.port}`;

    return `${protocol}://${storageConfig.endpoint}${portStr}/${storageConfig.bucket}/${objectKey}`;
  }

  /**
   * Extracts object key from a full URL
   */
  private extractObjectKey(fileUrl: string): string {
    // If it's already just an object key, return it
    if (!fileUrl.includes('://')) {
      return fileUrl;
    }

    // Extract from URL: http://localhost:9000/bucket/company-id/folder/file.jpg
    const parts = fileUrl.split(`/${storageConfig.bucket}/`);
    return parts[1] || fileUrl;
  }
}
