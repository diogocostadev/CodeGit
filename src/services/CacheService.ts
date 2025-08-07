import { invoke } from '@tauri-apps/api/tauri';
import { RepositoryInfo, CommitInfo, BranchInfo, FileChange } from '../types/state';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  persistToDisk: boolean;
  compressionEnabled: boolean;
}

interface RepositoryCacheData {
  repository: RepositoryInfo;
  commits: CommitInfo[];
  branches: BranchInfo[];
  fileChanges: FileChange[];
  status: any;
  remoteStatus: any;
  stashes: any[];
  lastRefresh: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private persistenceInterval: NodeJS.Timeout | null = null;
  private memoryUsage = 0;
  private readonly MAX_MEMORY_USAGE = 100 * 1024 * 1024; // 100MB
  
  // Cache categories with different TTL values
  private readonly CACHE_TYPES = {
    repository: { ttl: 5 * 60 * 1000, maxSize: 1000 }, // 5 minutes, max 1000 repos
    commits: { ttl: 10 * 60 * 1000, maxSize: 5000 }, // 10 minutes, max 5000 commit entries
    branches: { ttl: 3 * 60 * 1000, maxSize: 2000 }, // 3 minutes, max 2000 branch entries
    status: { ttl: 30 * 1000, maxSize: 1000 }, // 30 seconds, max 1000 status entries
    files: { ttl: 2 * 60 * 1000, maxSize: 3000 }, // 2 minutes, max 3000 file entries
    diff: { ttl: 5 * 60 * 1000, maxSize: 1000 }, // 5 minutes, max 1000 diff entries
    search: { ttl: 10 * 60 * 1000, maxSize: 500 }, // 10 minutes, max 500 search entries
    remote: { ttl: 15 * 60 * 1000, maxSize: 1000 } // 15 minutes, max 1000 remote entries
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      persistToDisk: true,
      compressionEnabled: true,
      ...config
    };

    this.initializeCache();
    this.startCleanupInterval();
  }

  /**
   * Initialize cache by loading from disk if persistence is enabled
   */
  private async initializeCache(): Promise<void> {
    if (this.config.persistToDisk) {
      try {
        const cached = await invoke<string>('load_cache_data');
        if (cached) {
          const data = JSON.parse(cached);
          Object.entries(data).forEach(([key, entry]: [string, any]) => {
            this.cache.set(key, entry);
          });
          this.updateMemoryUsage();
        }
      } catch (error) {
        console.warn('Failed to load cache from disk:', error);
      }
    }
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Run cleanup every minute

    // Start persistence interval if enabled
    if (this.config.persistToDisk) {
      this.persistenceInterval = setInterval(() => {
        this.persistToDisk();
      }, 5 * 60 * 1000); // Persist every 5 minutes
    }
  }

  /**
   * Get repository data from cache
   */
  async getRepository(repositoryId: string): Promise<RepositoryInfo | null> {
    return this.get(`repo:${repositoryId}`, 'repository');
  }

  /**
   * Cache repository data
   */
  async setRepository(repository: RepositoryInfo): Promise<void> {
    await this.set(`repo:${repository.id}`, repository, 'repository');
  }

  /**
   * Get commits for a repository from cache
   */
  async getCommits(repositoryId: string, branch?: string, limit?: number): Promise<CommitInfo[] | null> {
    const key = `commits:${repositoryId}:${branch || 'all'}:${limit || 100}`;
    return this.get(key, 'commits');
  }

  /**
   * Cache commits for a repository
   */
  async setCommits(repositoryId: string, commits: CommitInfo[], branch?: string, limit?: number): Promise<void> {
    const key = `commits:${repositoryId}:${branch || 'all'}:${limit || 100}`;
    await this.set(key, commits, 'commits');
  }

  /**
   * Get branches for a repository from cache
   */
  async getBranches(repositoryId: string): Promise<BranchInfo[] | null> {
    return this.get(`branches:${repositoryId}`, 'branches');
  }

  /**
   * Cache branches for a repository
   */
  async setBranches(repositoryId: string, branches: BranchInfo[]): Promise<void> {
    await this.set(`branches:${repositoryId}`, branches, 'branches');
  }

  /**
   * Get repository status from cache
   */
  async getRepositoryStatus(repositoryId: string): Promise<any | null> {
    return this.get(`status:${repositoryId}`, 'status');
  }

  /**
   * Cache repository status
   */
  async setRepositoryStatus(repositoryId: string, status: any): Promise<void> {
    await this.set(`status:${repositoryId}`, status, 'status');
  }

  /**
   * Get file changes from cache
   */
  async getFileChanges(repositoryId: string, commitHash?: string): Promise<FileChange[] | null> {
    const key = `files:${repositoryId}:${commitHash || 'working'}`;
    return this.get(key, 'files');
  }

  /**
   * Cache file changes
   */
  async setFileChanges(repositoryId: string, fileChanges: FileChange[], commitHash?: string): Promise<void> {
    const key = `files:${repositoryId}:${commitHash || 'working'}`;
    await this.set(key, fileChanges, 'files');
  }

  /**
   * Get file diff from cache
   */
  async getFileDiff(repositoryId: string, filePath: string, commitHash?: string): Promise<string | null> {
    const key = `diff:${repositoryId}:${filePath}:${commitHash || 'working'}`;
    return this.get(key, 'diff');
  }

  /**
   * Cache file diff
   */
  async setFileDiff(repositoryId: string, filePath: string, diff: string, commitHash?: string): Promise<void> {
    const key = `diff:${repositoryId}:${filePath}:${commitHash || 'working'}`;
    await this.set(key, diff, 'diff');
  }

  /**
   * Get search results from cache
   */
  async getSearchResults(query: string, repositoryId?: string): Promise<any | null> {
    const key = `search:${query}:${repositoryId || 'all'}`;
    return this.get(key, 'search');
  }

  /**
   * Cache search results
   */
  async setSearchResults(query: string, results: any, repositoryId?: string): Promise<void> {
    const key = `search:${query}:${repositoryId || 'all'}`;
    await this.set(key, results, 'search');
  }

  /**
   * Get remote status from cache
   */
  async getRemoteStatus(repositoryId: string, remoteName: string): Promise<any | null> {
    const key = `remote:${repositoryId}:${remoteName}`;
    return this.get(key, 'remote');
  }

  /**
   * Cache remote status
   */
  async setRemoteStatus(repositoryId: string, remoteName: string, status: any): Promise<void> {
    const key = `remote:${repositoryId}:${remoteName}`;
    await this.set(key, status, 'remote');
  }

  /**
   * Generic get method with TTL check
   */
  private async get<T>(key: string, type: keyof typeof this.CACHE_TYPES): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.updateMemoryUsage();
      return null;
    }

    // Update access time for LRU
    entry.timestamp = now;
    
    return entry.data as T;
  }

  /**
   * Generic set method with TTL
   */
  private async set<T>(key: string, data: T, type: keyof typeof this.CACHE_TYPES): Promise<void> {
    const cacheType = this.CACHE_TYPES[type];
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: cacheType.ttl,
      key
    };

    // Check memory limits before adding
    const dataSize = this.estimateSize(data);
    if (this.memoryUsage + dataSize > this.MAX_MEMORY_USAGE) {
      await this.evictLRU(dataSize);
    }

    this.cache.set(key, entry);
    this.memoryUsage += dataSize;

    // Check type-specific size limits
    await this.enforceTypeLimits(type);
  }

  /**
   * Invalidate cache entries for a repository
   */
  async invalidateRepository(repositoryId: string): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (key.includes(repositoryId)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    this.updateMemoryUsage();
  }

  /**
   * Invalidate cache entries by type
   */
  async invalidateByType(type: keyof typeof this.CACHE_TYPES): Promise<void> {
    const keysToDelete: string[] = [];
    const prefix = `${type}:`;
    
    for (const [key, entry] of this.cache) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    this.updateMemoryUsage();
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.memoryUsage = 0;
    
    if (this.config.persistToDisk) {
      try {
        await invoke('clear_cache_data');
      } catch (error) {
        console.error('Failed to clear cache on disk:', error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    memoryUsage: number;
    hitRate: number;
    typeBreakdown: Record<string, number>;
  } {
    const typeBreakdown: Record<string, number> = {};
    
    for (const [key, entry] of this.cache) {
      const type = key.split(':')[0];
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    }

    return {
      totalEntries: this.cache.size,
      memoryUsage: this.memoryUsage,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      typeBreakdown
    };
  }

  /**
   * Warm up cache for a repository
   */
  async warmUpRepository(repositoryId: string): Promise<void> {
    try {
      // Load basic repository info
      const repo = await invoke<any>('get_repository_info', { repositoryId });
      if (repo) {
        await this.setRepository(repo);
      }

      // Load recent commits
      const commits = await invoke<any[]>('get_repository_commits', { 
        repositoryId, 
        limit: 50 
      });
      if (commits) {
        await this.setCommits(repositoryId, commits, undefined, 50);
      }

      // Load branches
      const branches = await invoke<any[]>('get_repository_branches', { repositoryId });
      if (branches) {
        await this.setBranches(repositoryId, branches);
      }

      // Load current status
      const status = await invoke<any>('get_repository_status', { repositoryId });
      if (status) {
        await this.setRepositoryStatus(repositoryId, status);
      }

    } catch (error) {
      console.error('Failed to warm up cache for repository:', repositoryId, error);
    }
  }

  // Private helper methods

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now > entry.timestamp + entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });

    if (expiredKeys.length > 0) {
      this.updateMemoryUsage();
    }
  }

  private async evictLRU(neededSpace: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp); // Sort by timestamp (oldest first)

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      const entrySize = this.estimateSize(entry.data);
      this.cache.delete(key);
      freedSpace += entrySize;
      
      if (freedSpace >= neededSpace) {
        break;
      }
    }

    this.updateMemoryUsage();
  }

  private async enforceTypeLimits(type: keyof typeof this.CACHE_TYPES): Promise<void> {
    const typeConfig = this.CACHE_TYPES[type];
    const prefix = `${type}:`;
    const typeEntries = Array.from(this.cache.entries())
      .filter(([key]) => key.startsWith(prefix))
      .sort((a, b) => b[1].timestamp - a[1].timestamp); // Sort by timestamp (newest first)

    if (typeEntries.length > typeConfig.maxSize) {
      const entriesToRemove = typeEntries.slice(typeConfig.maxSize);
      entriesToRemove.forEach(([key]) => {
        this.cache.delete(key);
      });
      
      this.updateMemoryUsage();
    }
  }

  private estimateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimate: 2 bytes per character
  }

  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const [key, entry] of this.cache) {
      totalSize += this.estimateSize(entry);
    }
    this.memoryUsage = totalSize;
  }

  private async persistToDisk(): Promise<void> {
    if (!this.config.persistToDisk) return;

    try {
      const cacheData = Object.fromEntries(this.cache);
      const serialized = JSON.stringify(cacheData);
      
      await invoke('save_cache_data', { data: serialized });
    } catch (error) {
      console.error('Failed to persist cache to disk:', error);
    }
  }

  /**
   * Preload cache for multiple repositories
   */
  async preloadRepositories(repositoryIds: string[]): Promise<void> {
    const batchSize = 5; // Process 5 repositories at a time
    
    for (let i = 0; i < repositoryIds.length; i += batchSize) {
      const batch = repositoryIds.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(id => this.warmUpRepository(id))
      );
      
      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < repositoryIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Shutdown cache service
   */
  async shutdown(): Promise<void> {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
    }

    if (this.config.persistToDisk) {
      await this.persistToDisk();
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService({
  maxSize: 100 * 1024 * 1024, // 100MB
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  persistToDisk: true,
  compressionEnabled: true
});

export default cacheService;