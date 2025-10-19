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
  parentId?: string; // undefined for top-level; set for replies
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
  score?: number; // denormalized vote score
  repliesCount?: number; // denormalized number of replies
}

interface MongoConnection {
  client: MongoClient;
  db: Db;
  collection: Collection<CommunityComment>;
}

// Votes
export interface CommunityVote {
  _id: string; // `${commentId}:${voter}`
  commentId: string;
  voter: string; // lowercased address
  value: 1 | -1;
  createdAt: Date;
  updatedAt: Date;
}

interface VotesConnection {
  collection: Collection<CommunityVote>;
}

export class CommunityCommentsService {
  private static instance: CommunityCommentsService;
  private connection: MongoConnection | null = null;
  private votes: VotesConnection | null = null;

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
    const votesCollection = db.collection<CommunityVote>("community_votes");

    // Indexes for query patterns
    const indexes: Document[] = [
      { contractAddress: 1, chainId: 1, createdAt: -1 },
      { parentId: 1, createdAt: 1 },
      { "author.address": 1, createdAt: -1 },
      { "moderation.status": 1, createdAt: -1 },
      { createdAt: -1 },
    ];
    for (const keyDoc of indexes) {
      await (collection as unknown as Collection<Document>).createIndex(keyDoc);
    }

    await (votesCollection as unknown as Collection<Document>).createIndex(
      { commentId: 1, voter: 1 },
      { unique: true } as any
    );

    this.connection = { client, db, collection };
    this.votes = { collection: votesCollection };
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
      score: comment.score ?? 0,
      repliesCount: comment.repliesCount ?? 0,
    };
    // Normalize fields to ensure query matches
    doc.contractAddress = doc.contractAddress.toLowerCase();
    if (doc.author?.address) {
      doc.author.address = doc.author.address.toLowerCase();
    }
    await this.connection!.collection.insertOne(doc);
    // if reply, bump parent's repliesCount
    if (doc.parentId) {
      await this.connection!.collection.updateOne(
        { _id: doc.parentId },
        { $inc: { repliesCount: 1 }, $set: { updatedAt: new Date() } }
      );
    }
    return doc;
  }

  public async listByContract(params: {
    contractAddress: string;
    chainId: number;
    limit?: number;
    offset?: number;
    status?: ModerationInfo["status"];
    includeReplies?: boolean;
    authorAddress?: string; // to compute userVote
  }): Promise<{ items: CommunityComment[]; total: number; hasMore: boolean }> {
    if (!this.connection) await this.connect();
    const { contractAddress, chainId, limit = 20, offset = 0, status } = params;
    const lower = contractAddress.toLowerCase();
    const query: Record<string, unknown> = {
      // Case-insensitive match to include legacy mixed-case records
      contractAddress: { $regex: `^${lower}$`, $options: "i" },
      chainId,
      parentId: { $exists: false },
    };
    if (status) query["moderation.status"] = status;
    const total = await this.connection!.collection.countDocuments(query);
    const items = await this.connection!.collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    // attach vote score and optionally userVote, and replies count already denormalized
    const withScores = await Promise.all(
      items.map(async (c) => {
        const score = await this.getScore(c._id);
        const userVote = params.authorAddress
          ? await this.getUserVote(c._id, params.authorAddress)
          : 0;
        return { ...c, score, extra: { ...c.extra, userVote } } as CommunityComment;
      })
    );
    return { items: withScores, total, hasMore: offset + limit < total };
  }

  public async listReplies(parentId: string): Promise<CommunityComment[]> {
    if (!this.connection) await this.connect();
    const items = await this.connection!.collection
      .find({ parentId })
      .sort({ createdAt: 1 })
      .toArray();
    const withScores = await Promise.all(
      items.map(async (c) => ({ ...c, score: await this.getScore(c._id) }))
    );
    return withScores;
  }

  // Votes
  public async upsertVote(
    commentId: string,
    voter: string,
    value: 1 | -1
  ): Promise<{ newValue: 1 | -1; delta: number }> {
    if (!this.votes) await this.connect();
    const lower = voter.toLowerCase();
    const _id = `${commentId}:${lower}`;
    const now = new Date();
    const existing = await this.votes!.collection.findOne({ _id });
    if (existing) {
      if (existing.value === value) return { newValue: value, delta: 0 };
      await this.votes!.collection.updateOne(
        { _id },
        { $set: { value, updatedAt: now } }
      );
      await this.connection!.collection.updateOne(
        { _id: commentId },
        { $inc: { score: value - existing.value } }
      );
      return { newValue: value, delta: value - existing.value };
    }
    await this.votes!.collection.insertOne({
      _id,
      commentId,
      voter: lower,
      value,
      createdAt: now,
      updatedAt: now,
    });
    await this.connection!.collection.updateOne(
      { _id: commentId },
      { $inc: { score: value } }
    );
    return { newValue: value, delta: value };
  }

  public async removeVote(
    commentId: string,
    voter: string
  ): Promise<{ removed: boolean; delta: number }> {
    if (!this.votes) await this.connect();
    const lower = voter.toLowerCase();
    const _id = `${commentId}:${lower}`;
    const existing = await this.votes!.collection.findOne({ _id });
    if (!existing) return { removed: false, delta: 0 };
    await this.votes!.collection.deleteOne({ _id });
    await this.connection!.collection.updateOne(
      { _id: commentId },
      { $inc: { score: -existing.value } }
    );
    return { removed: true, delta: -existing.value };
  }

  public async getUserVote(commentId: string, voter: string): Promise<1 | -1 | 0> {
    if (!this.votes) await this.connect();
    const res = await this.votes!.collection.findOne({ _id: `${commentId}:${voter.toLowerCase()}` });
    return res ? res.value : 0;
  }

  public async getScore(commentId: string): Promise<number> {
    if (!this.connection) await this.connect();
    const found = await this.connection!.collection.findOne({ _id: commentId }, { projection: { score: 1 } });
    return found?.score ?? 0;
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
