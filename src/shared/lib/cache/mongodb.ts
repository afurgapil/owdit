import { MongoClient, Db, Collection } from "mongodb";
import { UnifiedContractAnalysis } from "../../../types/contractAnalysis";

// MongoDB connection interface
interface MongoConnection {
  client: MongoClient;
  db: Db;
  collection: Collection<CachedAnalysis>;
}

// Cached analysis document structure
interface CachedAnalysis {
  _id: string; // address:chainId format
  address: string;
  chainId: number;
  analysis: UnifiedContractAnalysis;
  createdAt: Date;
  updatedAt: Date;
  isUpgradeable: boolean;
  ttl?: Date; // Time to live for cache expiration
}

// Cache service class
export class ContractCacheService {
  private static instance: ContractCacheService;
  private connection: MongoConnection | null = null;
  private readonly CACHE_TTL_HOURS = 24; // Cache for 24 hours
  private readonly UPGRADEABLE_KEYWORDS = [
    "upgrade",
    "proxy",
    "transparent",
    "uups",
    "diamond",
    "beacon",
    "factory",
  ];

  private constructor() {}

  public static getInstance(): ContractCacheService {
    if (!ContractCacheService.instance) {
      ContractCacheService.instance = new ContractCacheService();
    }
    return ContractCacheService.instance;
  }

  // Initialize MongoDB connection
  public async connect(): Promise<void> {
    if (this.connection) {
      return; // Already connected
    }

    const mongoUri =
      process.env.MONGODB_URI ||
      "mongodb+srv://username:password@cluster.mongodb.net/owdit?retryWrites=true&w=majority";

    try {
      const client = new MongoClient(mongoUri, {
        // MongoDB Atlas connection options
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      await client.connect();

      const db = client.db("owdit");
      const collection = db.collection<CachedAnalysis>("contract_analyses");

      // Create indexes for better performance
      await collection.createIndex(
        { address: 1, chainId: 1 },
        { unique: true }
      );
      await collection.createIndex({ createdAt: 1 });
      await collection.createIndex({ updatedAt: 1 });
      await collection.createIndex({ isUpgradeable: 1 });

      this.connection = { client, db, collection };
      console.log("✅ [Cache] MongoDB connected successfully");
    } catch (error) {
      console.error("❌ [Cache] MongoDB connection failed:", error);
      throw error;
    }
  }

  // Check if contract is upgradeable based on source code
  private isContractUpgradeable(sourceCode: string): boolean {
    if (!sourceCode) return false;

    const lowerSourceCode = sourceCode.toLowerCase();
    return this.UPGRADEABLE_KEYWORDS.some((keyword) =>
      lowerSourceCode.includes(keyword)
    );
  }

  // Generate cache key
  private getCacheKey(address: string, chainId: number): string {
    return `${address.toLowerCase()}:${chainId}`;
  }

  // Get cached analysis
  public async getCachedAnalysis(
    address: string,
    chainId: number
  ): Promise<UnifiedContractAnalysis | null> {
    if (!this.connection) {
      await this.connect();
    }

    try {
      const cacheKey = this.getCacheKey(address, chainId);
      const cached = await this.connection!.collection.findOne({
        _id: cacheKey,
      });

      if (!cached) {
        console.log(
          `🔍 [Cache] No cached analysis found for ${address}:${chainId}`
        );
        return null;
      }

      // Check if cache is expired
      const now = new Date();
      if (cached.ttl && cached.ttl < now) {
        console.log(`⏰ [Cache] Cache expired for ${address}:${chainId}`);
        await this.deleteCachedAnalysis(address, chainId);
        return null;
      }

      console.log(`✅ [Cache] Found cached analysis for ${address}:${chainId}`);
      return cached.analysis;
    } catch (error) {
      console.error("❌ [Cache] Error getting cached analysis:", error);
      return null;
    }
  }

  // Cache analysis result
  public async cacheAnalysis(
    address: string,
    chainId: number,
    analysis: UnifiedContractAnalysis,
    isUpgradeableFromRisk?: boolean
  ): Promise<void> {
    if (!this.connection) {
      await this.connect();
    }

    try {
      // Check if contract is upgradeable
      let isUpgradeable = false;

      // Check from source code if available
      if (analysis.sourceCode?.sourceCode) {
        isUpgradeable = this.isContractUpgradeable(
          analysis.sourceCode.sourceCode
        );
      }

      // Check from risk analysis if provided
      if (isUpgradeableFromRisk !== undefined) {
        isUpgradeable = isUpgradeableFromRisk;
      }

      // Don't cache upgradeable contracts
      if (isUpgradeable) {
        console.log(
          `⚠️ [Cache] Skipping cache for upgradeable contract ${address}:${chainId}`
        );
        return;
      }

      const cacheKey = this.getCacheKey(address, chainId);
      const ttl = new Date();
      ttl.setHours(ttl.getHours() + this.CACHE_TTL_HOURS);

      const cachedDoc: CachedAnalysis = {
        _id: cacheKey,
        address: address.toLowerCase(),
        chainId,
        analysis,
        createdAt: new Date(),
        updatedAt: new Date(),
        isUpgradeable: false,
        ttl,
      };

      await this.connection!.collection.replaceOne(
        { _id: cacheKey },
        cachedDoc,
        { upsert: true }
      );

      console.log(`💾 [Cache] Cached analysis for ${address}:${chainId}`);
    } catch (error) {
      console.error("❌ [Cache] Error caching analysis:", error);
      // Don't throw error - caching is not critical
    }
  }

  // Delete cached analysis
  public async deleteCachedAnalysis(
    address: string,
    chainId: number
  ): Promise<void> {
    if (!this.connection) {
      await this.connect();
    }

    try {
      const cacheKey = this.getCacheKey(address, chainId);
      await this.connection!.collection.deleteOne({ _id: cacheKey });
      console.log(
        `🗑️ [Cache] Deleted cached analysis for ${address}:${chainId}`
      );
    } catch (error) {
      console.error("❌ [Cache] Error deleting cached analysis:", error);
    }
  }

  // Get cache statistics
  public async getCacheStats(): Promise<{
    totalCached: number;
    upgradeableCached: number;
    expiredCached: number;
  }> {
    if (!this.connection) {
      await this.connect();
    }

    try {
      const totalCached = await this.connection!.collection.countDocuments();
      const upgradeableCached =
        await this.connection!.collection.countDocuments({
          isUpgradeable: true,
        });
      const now = new Date();
      const expiredCached = await this.connection!.collection.countDocuments({
        ttl: { $lt: now },
      });

      return {
        totalCached,
        upgradeableCached,
        expiredCached,
      };
    } catch (error) {
      console.error("❌ [Cache] Error getting cache stats:", error);
      return { totalCached: 0, upgradeableCached: 0, expiredCached: 0 };
    }
  }

  // Clean expired cache entries
  public async cleanExpiredCache(): Promise<number> {
    if (!this.connection) {
      await this.connect();
    }

    try {
      const now = new Date();
      const result = await this.connection!.collection.deleteMany({
        ttl: { $lt: now },
      });
      console.log(
        `🧹 [Cache] Cleaned ${result.deletedCount} expired cache entries`
      );
      return result.deletedCount;
    } catch (error) {
      console.error("❌ [Cache] Error cleaning expired cache:", error);
      return 0;
    }
  }

  // Get history of cached analyses
  public async getHistory(
    limit: number = 50,
    offset: number = 0,
    search?: string
  ): Promise<{
    history: Array<{
      address: string;
      chainId: number;
      score: number;
      level: string;
      timestamp: string;
      contractName?: string;
      compilerVersion?: string;
      status: string;
      findings: unknown[];
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    if (!this.connection) {
      await this.connect();
    }

    try {
      // Build query
      const query: Record<string, unknown> = {};
      if (search) {
        query.$or = [
          { address: { $regex: search, $options: "i" } },
          { "analysis.contractInfo.name": { $regex: search, $options: "i" } },
        ];
      }

      // Get total count
      const total = await this.connection!.collection.countDocuments(query);

      // Get paginated results
      const results = await this.connection!.collection.find(query)
        .sort({ createdAt: -1 }) // Most recent first
        .skip(offset)
        .limit(limit)
        .toArray();

      // Transform results to history format
      const history = results.map((cached) => {
        const analysis = cached.analysis;
        const score = analysis.aiOutput?.score ?? 50;
        const level =
          score >= 80
            ? "low"
            : score >= 60
            ? "medium"
            : score >= 40
            ? "high"
            : "high";

        return {
          address: analysis.address,
          chainId: analysis.chainId,
          score,
          level,
          timestamp: analysis.timestamp,
          contractName: analysis.contractInfo.name,
          compilerVersion: analysis.contractInfo.compilerVersion,
          status: "completed",
          findings: [],
        };
      });

      return {
        history,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    } catch (error) {
      console.error("❌ [Cache] Error getting history:", error);
      return {
        history: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
      };
    }
  }

  // Close connection
  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.client.close();
      this.connection = null;
      console.log("🔌 [Cache] MongoDB connection closed");
    }
  }
}

// Export singleton instance
export const contractCache = ContractCacheService.getInstance();
