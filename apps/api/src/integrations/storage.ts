import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';

/**
 * Object storage adapter backed by AWS S3.
 *
 * Exposes the same tiny surface the codebase already used with
 * `@replit/object-storage` (`uploadFromBytes` / `downloadAsBytes` / `delete`)
 * so the storage-consuming services only need to swap their import.
 *
 * Configuration (env):
 *   STORAGE_BUCKET       (required) — S3 bucket name
 *   STORAGE_REGION       (required) — e.g. ap-southeast-1  [falls back to AWS_REGION]
 *   STORAGE_ACCESS_KEY   (optional) — IAM access key id     [falls back to the
 *   STORAGE_SECRET_KEY   (optional) — IAM secret access key   default AWS credential
 *                                                             chain when omitted]
 *   STORAGE_ENDPOINT     (optional) — custom endpoint for S3-compatible stores
 *                                     (MinIO / Cloudflare R2 / LocalStack)
 */

type OkResult<T = undefined> = T extends undefined
  ? { ok: true }
  : { ok: true; value: T };

type ErrResult = { ok: false; error: Error };

export type StorageResult<T = undefined> = OkResult<T> | ErrResult;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — object storage is not configured`);
  }
  return value;
}

function buildConfig(): S3ClientConfig {
  const region =
    process.env.STORAGE_REGION ?? process.env.AWS_REGION ?? undefined;
  if (!region) {
    throw new Error(
      'STORAGE_REGION (or AWS_REGION) is not set — object storage is not configured',
    );
  }

  const config: S3ClientConfig = { region };

  const accessKeyId = process.env.STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.STORAGE_SECRET_KEY;
  if (accessKeyId && secretAccessKey) {
    config.credentials = { accessKeyId, secretAccessKey };
  }
  // Otherwise the SDK's default credential chain is used (env AWS_*, shared
  // config file, or an attached instance / task role in production).

  const endpoint = process.env.STORAGE_ENDPOINT;
  if (endpoint) {
    config.endpoint = endpoint;
    config.forcePathStyle = true;
  }

  return config;
}

export class Client {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = requireEnv('STORAGE_BUCKET');
    this.s3 = new S3Client(buildConfig());
  }

  /** Store `data` under `key`, overwriting any existing object. */
  async uploadFromBytes(key: string, data: Buffer): Promise<StorageResult> {
    try {
      await this.s3.send(
        new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data }),
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  /**
   * Fetch the object at `key`.
   * On success `value` is a single-element tuple `[Buffer]` — matching the
   * shape the previous SDK returned, so callers can keep doing `result.value[0]`.
   */
  async downloadAsBytes(key: string): Promise<StorageResult<[Buffer]>> {
    try {
      const response = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!response.Body) {
        return { ok: false, error: new Error('S3 returned an empty body') };
      }
      const bytes = await response.Body.transformToByteArray();
      return { ok: true, value: [Buffer.from(bytes)] };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  /** Remove the object at `key`. Succeeds even if the object is already gone. */
  async delete(key: string): Promise<StorageResult> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }
}
