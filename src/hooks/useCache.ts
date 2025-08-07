import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheService } from '../services/CacheService';
import { RepositoryInfo, CommitInfo, BranchInfo, FileChange } from '../types/state';

interface UseCacheOptions {
  enabled?: boolean;
  autoInvalidate?: boolean;
  preloadOnMount?: boolean;
}

interface CacheStats {
  totalEntries: number;
  memoryUsage: number;
  hitRate: number;
  typeBreakdown: Record<string, number>;
}

interface UseCacheResult {
  // Repository operations
  getRepository: (repositoryId: string) => Promise<RepositoryInfo | null>;
  setRepository: (repository: RepositoryInfo) => Promise<void>;
  
  // Commits operations
  getCommits: (repositoryId: string, branch?: string, limit?: number) => Promise<CommitInfo[] | null>;
  setCommits: (repositoryId: string, commits: CommitInfo[], branch?: string, limit?: number) => Promise<void>;
  
  // Branches operations  
  getBranches: (repositoryId: string) => Promise<BranchInfo[] | null>;
  setBranches: (repositoryId: string, branches: BranchInfo[]) => Promise<void>;
  
  // Status operations
  getRepositoryStatus: (repositoryId: string) => Promise<any | null>;
  setRepositoryStatus: (repositoryId: string, status: any) => Promise<void>;
  
  // File operations
  getFileChanges: (repositoryId: string, commitHash?: string) => Promise<FileChange[] | null>;
  setFileChanges: (repositoryId: string, fileChanges: FileChange[], commitHash?: string) => Promise<void>;
  getFileDiff: (repositoryId: string, filePath: string, commitHash?: string) => Promise<string | null>;
  setFileDiff: (repositoryId: string, filePath: string, diff: string, commitHash?: string) => Promise<void>;
  
  // Search operations
  getSearchResults: (query: string, repositoryId?: string) => Promise<any | null>;
  setSearchResults: (query: string, results: any, repositoryId?: string) => Promise<void>;
  
  // Remote operations
  getRemoteStatus: (repositoryId: string, remoteName: string) => Promise<any | null>;
  setRemoteStatus: (repositoryId: string, remoteName: string, status: any) => Promise<void>;
  
  // Cache management
  invalidateRepository: (repositoryId: string) => Promise<void>;
  invalidateByType: (type: string) => Promise<void>;
  warmUpRepository: (repositoryId: string) => Promise<void>;
  preloadRepositories: (repositoryIds: string[]) => Promise<void>;
  clearCache: () => Promise<void>;
  
  // Cache statistics
  stats: CacheStats | null;
  refreshStats: () => void;
  
  // State
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useCache = (options: UseCacheOptions = {}): UseCacheResult => {
  const {
    enabled = true,
    autoInvalidate = true,
    preloadOnMount = false
  } = options;

  const [isEnabled, setIsEnabled] = useState(enabled);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const lastStatsUpdate = useRef<number>(0);
  const statsUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Auto-update cache stats
  useEffect(() => {
    if (isEnabled) {
      refreshStats();
      
      // Start interval to update stats
      statsUpdateInterval.current = setInterval(() => {
        refreshStats();
      }, 10000); // Update every 10 seconds
      
      return () => {
        if (statsUpdateInterval.current) {
          clearInterval(statsUpdateInterval.current);
        }
      };
    }
  }, [isEnabled]);

  // Repository operations
  const getRepository = useCallback(async (repositoryId: string): Promise<RepositoryInfo | null> => {
    if (!isEnabled) return null;
    return cacheService.getRepository(repositoryId);
  }, [isEnabled]);

  const setRepository = useCallback(async (repository: RepositoryInfo): Promise<void> => {
    if (!isEnabled) return;
    await cacheService.setRepository(repository);
    refreshStats();
  }, [isEnabled]);

  // Commits operations
  const getCommits = useCallback(async (
    repositoryId: string, 
    branch?: string, 
    limit?: number
  ): Promise<CommitInfo[] | null> => {
    if (!isEnabled) return null;
    return cacheService.getCommits(repositoryId, branch, limit);
  }, [isEnabled]);

  const setCommits = useCallback(async (
    repositoryId: string, 
    commits: CommitInfo[], 
    branch?: string, 
    limit?: number
  ): Promise<void> => {
    if (!isEnabled) return;
    await cacheService.setCommits(repositoryId, commits, branch, limit);
    refreshStats();
  }, [isEnabled]);

  // Branches operations
  const getBranches = useCallback(async (repositoryId: string): Promise<BranchInfo[] | null> => {
    if (!isEnabled) return null;
    return cacheService.getBranches(repositoryId);
  }, [isEnabled]);

  const setBranches = useCallback(async (repositoryId: string, branches: BranchInfo[]): Promise<void> => {
    if (!isEnabled) return;
    await cacheService.setBranches(repositoryId, branches);
    refreshStats();
  }, [isEnabled]);

  // Status operations
  const getRepositoryStatus = useCallback(async (repositoryId: string): Promise<any | null> => {
    if (!isEnabled) return null;
    return cacheService.getRepositoryStatus(repositoryId);
  }, [isEnabled]);

  const setRepositoryStatus = useCallback(async (repositoryId: string, status: any): Promise<void> => {
    if (!isEnabled) return;
    await cacheService.setRepositoryStatus(repositoryId, status);
    refreshStats();
  }, [isEnabled]);

  // File operations
  const getFileChanges = useCallback(async (
    repositoryId: string, 
    commitHash?: string
  ): Promise<FileChange[] | null> => {
    if (!isEnabled) return null;
    return cacheService.getFileChanges(repositoryId, commitHash);
  }, [isEnabled]);

  const setFileChanges = useCallback(async (
    repositoryId: string, 
    fileChanges: FileChange[], 
    commitHash?: string
  ): Promise<void> => {
    if (!isEnabled) return;
    await cacheService.setFileChanges(repositoryId, fileChanges, commitHash);
    refreshStats();
  }, [isEnabled]);

  const getFileDiff = useCallback(async (
    repositoryId: string, 
    filePath: string, 
    commitHash?: string
  ): Promise<string | null> => {
    if (!isEnabled) return null;
    return cacheService.getFileDiff(repositoryId, filePath, commitHash);
  }, [isEnabled]);

  const setFileDiff = useCallback(async (
    repositoryId: string, 
    filePath: string, 
    diff: string, 
    commitHash?: string
  ): Promise<void> => {
    if (!isEnabled) return;
    await cacheService.setFileDiff(repositoryId, filePath, diff, commitHash);
    refreshStats();
  }, [isEnabled]);

  // Search operations
  const getSearchResults = useCallback(async (
    query: string, 
    repositoryId?: string
  ): Promise<any | null> => {
    if (!isEnabled) return null;
    return cacheService.getSearchResults(query, repositoryId);
  }, [isEnabled]);

  const setSearchResults = useCallback(async (
    query: string, 
    results: any, 
    repositoryId?: string
  ): Promise<void> => {
    if (!isEnabled) return;
    await cacheService.setSearchResults(query, results, repositoryId);
    refreshStats();
  }, [isEnabled]);

  // Remote operations
  const getRemoteStatus = useCallback(async (
    repositoryId: string, 
    remoteName: string
  ): Promise<any | null> => {
    if (!isEnabled) return null;
    return cacheService.getRemoteStatus(repositoryId, remoteName);
  }, [isEnabled]);

  const setRemoteStatus = useCallback(async (
    repositoryId: string, 
    remoteName: string, 
    status: any
  ): Promise<void> => {
    if (!isEnabled) return;
    await cacheService.setRemoteStatus(repositoryId, remoteName, status);
    refreshStats();
  }, [isEnabled]);

  // Cache management
  const invalidateRepository = useCallback(async (repositoryId: string): Promise<void> => {
    if (!isEnabled) return;
    await cacheService.invalidateRepository(repositoryId);
    refreshStats();
  }, [isEnabled]);

  const invalidateByType = useCallback(async (type: string): Promise<void> => {
    if (!isEnabled) return;
    await cacheService.invalidateByType(type as any);
    refreshStats();
  }, [isEnabled]);

  const warmUpRepository = useCallback(async (repositoryId: string): Promise<void> => {
    if (!isEnabled) return;
    await cacheService.warmUpRepository(repositoryId);
    refreshStats();
  }, [isEnabled]);

  const preloadRepositories = useCallback(async (repositoryIds: string[]): Promise<void> => {
    if (!isEnabled) return;
    await cacheService.preloadRepositories(repositoryIds);
    refreshStats();
  }, [isEnabled]);

  const clearCache = useCallback(async (): Promise<void> => {
    if (!isEnabled) return;
    await cacheService.clear();
    refreshStats();
  }, [isEnabled]);

  // Stats management
  const refreshStats = useCallback(() => {
    if (isEnabled) {
      const now = Date.now();
      // Throttle stats updates to avoid excessive calculations
      if (now - lastStatsUpdate.current > 1000) { // Max once per second
        const newStats = cacheService.getCacheStats();
        setStats(newStats);
        lastStatsUpdate.current = now;
      }
    } else {
      setStats(null);
    }
  }, [isEnabled]);

  // Helper hook for caching Git operations with fallback to API
  const useCachedGitOperation = useCallback(<T>(
    cacheKey: string,
    apiCall: () => Promise<T>,
    cacheSetter: (data: T) => Promise<void>,
    cacheGetter: () => Promise<T | null>
  ) => {
    return useCallback(async (): Promise<T> => {
      // Try cache first if enabled
      if (isEnabled) {
        const cached = await cacheGetter();
        if (cached !== null) {
          return cached;
        }
      }

      // Fall back to API call
      const result = await apiCall();
      
      // Cache the result if enabled
      if (isEnabled) {
        await cacheSetter(result);
      }

      return result;
    }, [isEnabled, apiCall, cacheSetter, cacheGetter]);
  }, [isEnabled]);

  return {
    // Repository operations
    getRepository,
    setRepository,
    
    // Commits operations
    getCommits,
    setCommits,
    
    // Branches operations  
    getBranches,
    setBranches,
    
    // Status operations
    getRepositoryStatus,
    setRepositoryStatus,
    
    // File operations
    getFileChanges,
    setFileChanges,
    getFileDiff,
    setFileDiff,
    
    // Search operations
    getSearchResults,
    setSearchResults,
    
    // Remote operations
    getRemoteStatus,
    setRemoteStatus,
    
    // Cache management
    invalidateRepository,
    invalidateByType,
    warmUpRepository,
    preloadRepositories,
    clearCache,
    
    // Cache statistics
    stats,
    refreshStats,
    
    // State
    isEnabled,
    setEnabled
  };
};

/**
 * Hook for automatically caching and retrieving data with automatic fallback
 */
export const useCachedData = <T>(
  key: string,
  fetcher: () => Promise<T>,
  dependencies: any[] = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cache = useCache();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try cache first
      const cached = await cache.getSearchResults(key);
      if (cached !== null) {
        setData(cached);
        setLoading(false);
        return;
      }

      // Fetch from API
      const result = await fetcher();
      setData(result);
      
      // Cache the result
      await cache.setSearchResults(key, result);
      
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, cache, ...dependencies]);

  const refresh = useCallback(async () => {
    // Invalidate cache and refetch
    await cache.invalidateByType('search');
    await fetchData();
  }, [cache, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh
  };
};

export default useCache;