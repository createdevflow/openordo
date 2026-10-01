import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageDriver {
  put(key: string, body: Buffer | ReadableStream, mime: string): Promise<void>;
  get(key: string): Promise<{ stream: ReadableStream; size: number }>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
  signedGetUrl?(key: string, ttlSeconds: number): Promise<string>;
}

function toNodeReadable(webStream: ReadableStream): Readable {
  return Readable.fromWeb(webStream as any);
}

function toWebReadable(nodeStream: NodeJS.ReadableStream): ReadableStream {
  return Readable.toWeb(nodeStream as any) as any;
}

export class LocalDiskDriver implements StorageDriver {
  private baseDir: string;

  constructor(baseDir = path.join(process.cwd(), ".storage")) {
    this.baseDir = baseDir;
  }

  async put(key: string, body: Buffer | ReadableStream, mime: string): Promise<void> {
    const fullPath = path.join(this.baseDir, key);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });

    if (Buffer.isBuffer(body)) {
      await fs.promises.writeFile(fullPath, body);
    } else {
      const writeStream = fs.createWriteStream(fullPath);
      const readStream = toNodeReadable(body);
      await new Promise<void>((resolve, reject) => {
        readStream.pipe(writeStream);
        writeStream.on("finish", () => resolve());
        writeStream.on("error", reject);
        readStream.on("error", reject);
      });
    }
  }

  async get(key: string): Promise<{ stream: ReadableStream; size: number }> {
    const fullPath = path.join(this.baseDir, key);
    const stats = await fs.promises.stat(fullPath);
    const readStream = fs.createReadStream(fullPath);
    return { stream: toWebReadable(readStream), size: stats.size };
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.baseDir, key);
    await fs.promises.unlink(fullPath).catch(err => {
      if (err.code !== "ENOENT") throw err;
    });
  }

  async deletePrefix(prefix: string): Promise<void> {
    const fullPath = path.join(this.baseDir, prefix);
    await fs.promises.rm(fullPath, { recursive: true, force: true }).catch(err => {
      if (err.code !== "ENOENT") throw err;
    });
  }
}

export class S3Driver implements StorageDriver {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || "";
    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
    });
  }

  async put(key: string, body: Buffer | ReadableStream, mime: string): Promise<void> {
    let finalBody: Buffer | Uint8Array;
    if (Buffer.isBuffer(body)) {
      finalBody = body;
    } else {
      const chunks = [];
      const reader = (body as any).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      finalBody = Buffer.concat(chunks);
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: finalBody,
      ContentType: mime,
    });
    await this.client.send(command);
  }

  async get(key: string): Promise<{ stream: ReadableStream; size: number }> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const result = await this.client.send(command);
    if (!result.Body) throw new Error("S3 object has no body");
    return {
      stream: result.Body.transformToWebStream(),
      size: result.ContentLength || 0,
    };
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }

  async deletePrefix(prefix: string): Promise<void> {
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;

    while (isTruncated) {
      const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });
      const result = await this.client.send(listCommand);
      
      if (result.Contents && result.Contents.length > 0) {
        for (const item of result.Contents) {
          if (item.Key) {
            await this.delete(item.Key);
          }
        }
      }
      
      isTruncated = result.IsTruncated ?? false;
      continuationToken = result.NextContinuationToken;
    }
  }

  async signedGetUrl(key: string, ttlSeconds: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: ttlSeconds });
  }
}

export function getStorageDriver(): StorageDriver {
  if (process.env.STORAGE_DRIVER === "s3") {
    return new S3Driver();
  }
  return new LocalDiskDriver();
}
