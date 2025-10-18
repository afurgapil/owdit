import { MongoClient, Db, Collection, Document } from "mongodb";
import { randomUUID } from "crypto";

// Core artifact attached to a comment (e.g., PoC, tx trace, report)
export interface CommentArtifact {
  type: "poc" | "tx-trace" | "report" | "other";
  cid: string; // 0G Storage CID or content-addressed reference
  title?: string;
  url?: string; // optional gateway URL for quick access
  metadata?: Record<string, unknown>; // free-form metadata
}

// Moderation metadata produced by 0G inference (spam/toksisite etc.)
export interface ModerationInfo {
  toxicityScore?: number; // 0..1
  spamScore?: number; // 0..1
  flaggedReasons?: string[];
  reviewedBy?: string; // moderator id/address
  reviewedAt?: Date;
  status: "pending" | "approved" | "rejected";
}

// Lightweight reputation snapshot for the author at the time of posting
export interface ReputationSnapshot {
  score?: number; // 0..100
  badges?: string[];
}

export interface CommunityComment {
  _id: string; // `${contractAddress.toLowerCase()}:${chainId}:${commentId}` or UUID
  contractAddress: string; // checksum not enforced here; normalize to lower
  chainId: number;
  message: string;
  artifacts?: CommentArtifact[];
  author: {
    address: string; // EOA or system id
    displayName?: string;
  };
  signature?: string; // EIP-191/SiWE signature
  createdAt: Date;
  updatedAt: Date;
  moderation: ModerationInfo;
  reputation?: ReputationSnapshot;
  // Extensible map for future additions (e.g., votes, tags)
  extra?: Record<string, unknown>;
}

interface MongoConnection {
  client: MongoClient;
  db: Db;
  collection: Collection<CommunityComment>;
}

export class CommunityCommentsService {
  private static instance: CommunityCommentsService;
  private connection: MongoConnection | null = null;

  private constructor() {}

  public static getInstance(): CommunityCommentsService {
    if (!CommunityCommentsService.instance) {
      CommunityCommentsService.instance = new CommunityCommentsService();
    }
    return CommunityCommentsService.instance;
  }

  private async connect(): Promise<void> {
    if (this.connection) return;

    const mongoUri =
      process.env.MONGODB_URI ||
      "mongodb+srv://username:password@cluster.mongodb.net/owdit?retryWrites=true&w=majority";

    const client = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    await client.connect();

    const db = client.db("owdit");
    const collection = db.collection<CommunityComment>("community_comments");

    // Indexes for query patterns
    const indexes: Document[] = [
      { contractAddress: 1, chainId: 1, createdAt: -1 },
      { "author.address": 1, createdAt: -1 },
      { "moderation.status": 1, createdAt: -1 },
      { createdAt: -1 },
    ];
    for (const keyDoc of indexes) {
      await (collection as unknown as Collection<Document>).createIndex(keyDoc);
    }

    this.connection = { client, db, collection };
  }

  private buildId(
    contractAddress: string,
    chainId: number,
    id?: string
  ): string {
    const base = `${contractAddress.toLowerCase()}:${chainId}`;
    return id ? `${base}:${id}` : `${base}:${randomUUID()}`;
  }

  public async create(
    comment: Omit<CommunityComment, "_id" | "createdAt" | "updatedAt"> & {
      _id?: string;
    }
  ): Promise<CommunityComment> {
    if (!this.connection) await this.connect();
    const now = new Date();
    const _id =
      comment._id || this.buildId(comment.contractAddress, comment.chainId);
    const doc: CommunityComment = {
      ...comment,
      _id,
      createdAt: now,
      updatedAt: now,
    };
    await this.connection!.collection.insertOne(doc);
    return doc;
  }

  public async listByContract(params: {
    contractAddress: string;
    chainId: number;
    limit?: number;
    offset?: number;
    status?: ModerationInfo["status"];
  }): Promise<{ items: CommunityComment[]; total: number; hasMore: boolean }> {
    if (!this.connection) await this.connect();
    const { contractAddress, chainId, limit = 20, offset = 0, status } = params;
    const query: Record<string, unknown> = {
      contractAddress: contractAddress.toLowerCase(),
      chainId,
    };
    if (status) query["moderation.status"] = status;
    const total = await this.connection!.collection.countDocuments(query);
    const items = await this.connection!.collection.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    return { items, total, hasMore: offset + limit < total };
  }

  public async updateModeration(
    id: string,
    moderation: Partial<ModerationInfo>
  ): Promise<boolean> {
    if (!this.connection) await this.connect();
    const existing = await this.connection!.collection.findOne({ _id: id });
    if (!existing) return false;
    const merged: ModerationInfo = {
      status: moderation.status ?? existing.moderation?.status ?? "pending",
      toxicityScore:
        moderation.toxicityScore ?? existing.moderation?.toxicityScore,
      spamScore: moderation.spamScore ?? existing.moderation?.spamScore,
      flaggedReasons:
        moderation.flaggedReasons ?? existing.moderation?.flaggedReasons,
      reviewedBy: moderation.reviewedBy ?? existing.moderation?.reviewedBy,
      reviewedAt: moderation.reviewedAt ?? existing.moderation?.reviewedAt,
    };
    const res = await this.connection!.collection.updateOne(
      { _id: id },
      { $set: { moderation: merged, updatedAt: new Date() } }
    );
    return res.modifiedCount > 0;
  }

  public async addArtifact(
    id: string,
    artifact: CommentArtifact
  ): Promise<boolean> {
    if (!this.connection) await this.connect();
    const res = await this.connection!.collection.updateOne(
      { _id: id },
      { $push: { artifacts: artifact }, $set: { updatedAt: new Date() } }
    );
    return res.modifiedCount > 0;
  }

  public async remove(id: string): Promise<boolean> {
    if (!this.connection) await this.connect();
    const res = await this.connection!.collection.deleteOne({ _id: id });
    return res.deletedCount > 0;
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.client.close();
      this.connection = null;
    }
  }
}

export const communityComments = CommunityCommentsService.getInstance();
