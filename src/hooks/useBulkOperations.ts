import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { bulkOperations, BulkOperationOptions } from '../services/BulkOperationsService';
import { RepositoryInfo, BulkOperationResult, BulkOperationProgress } from '../types/operations';

interface UseBulkOperationsOptions {
  maxConcurrent?: number;
  timeout?: number;
  abortOnError?: boolean;
  autoRefreshStatus?: boolean;
}

interface UseBulkOperationsResult {
  // State
  isRunning: boolean;
  progress: BulkOperationProgress | null;
  results: Map<string, BulkOperationResult>;
  error: string | null;
  
  // Operations
  pullAll: (repositories: RepositoryInfo[]) => Promise<void>;
  pushAll: (repositories: RepositoryInfo[]) => Promise<void>;
  fetchAll: (repositories: RepositoryInfo[]) => Promise<void>;
  syncAll: (repositories: RepositoryInfo[]) => Promise<void>;
  checkoutBranchAll: (repositories: RepositoryInfo[], branchName: string) => Promise<void>;
  createBranchAll: (repositories: RepositoryInfo[], branchName: string, fromBranch?: string) => Promise<void>;
  deleteBranchAll: (repositories: RepositoryInfo[], branchName: string, force?: boolean) => Promise<void>;
  getStatusAll: (repositories: RepositoryInfo[]) => Promise<void>;
  stashAll: (repositories: RepositoryInfo[], message?: string) => Promise<void>;
  resetHardAll: (repositories: RepositoryInfo[], target?: string) => Promise<void>;
  cleanAll: (repositories: RepositoryInfo[], force?: boolean) => Promise<void>;
  
  // Control
  abortOperation: () => void;
  clearResults: () => void;
  clearError: () => void;
  
  // Utilities
  getValidRepositories: (repositories: RepositoryInfo[]) => RepositoryInfo[];
  getInvalidRepositories: (repositories: RepositoryInfo[]) => { repository: RepositoryInfo; reason: string }[];
  getOperationStats: () => {
    total: number;
    completed: number;
    failed: number;
    avgDuration: number;
    totalDuration: number;
  } | null;
}

export const useBulkOperations = (
  options: UseBulkOperationsOptions = {}
): UseBulkOperationsResult => {
  const {
    maxConcurrent = 3,
    timeout = 30000,
    abortOnError = false,
    autoRefreshStatus = true
  } = options;

  const { addError, refreshRepository } = useAppState();
  
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const [results, setResults] = useState<Map<string, BulkOperationResult>>(new Map());
  const [error, setError] = useState<string | null>(null);
  
  const currentOperationIdRef = useRef<string | null>(null);
  const lastProgressRef = useRef<BulkOperationProgress | null>(null);

  // Auto-refresh repository status when operations complete
  useEffect(() => {
    if (!isRunning && lastProgressRef.current && autoRefreshStatus) {
      const completedResults = Array.from(results.values())
        .filter(result => result.status === 'completed');
      
      // Refresh repositories that completed successfully
      completedResults.forEach(result => {
        refreshRepository(result.repository_id);
      });
      
      lastProgressRef.current = null;
    }
  }, [isRunning, results, autoRefreshStatus, refreshRepository]);

  const executeOperation = useCallback(async (
    operation: string,
    repositories: RepositoryInfo[],
    operationParams: Record<string, any> = {}
  ) => {
    if (isRunning) {
      throw new Error('Another bulk operation is already running');
    }

    setIsRunning(true);
    setError(null);
    setResults(new Map());
    setProgress(null);

    const operationOptions: BulkOperationOptions = {
      maxConcurrent,
      timeout,
      abortOnError,
      notifyProgress: (progressUpdate) => {
        setProgress(progressUpdate);
        lastProgressRef.current = progressUpdate;
      }
    };

    try {
      const operationResults = await bulkOperations.executeBulkOperation(
        repositories,
        operation,
        operationParams,
        operationOptions
      );

      setResults(operationResults);

      // Check for failures and add error notifications
      const failed = Array.from(operationResults.values()).filter(r => r.status === 'error');
      if (failed.length > 0) {
        const errorMessage = `${failed.length} repositories failed during ${operation}`;
        addError({ message: errorMessage, type: 'bulk_operation_error' });
      }

    } catch (err: any) {
      const errorMessage = err.message || `Failed to execute ${operation}`;
      setError(errorMessage);
      addError({ message: errorMessage, type: 'bulk_operation_error' });
    } finally {
      setIsRunning(false);
      currentOperationIdRef.current = null;
    }
  }, [isRunning, maxConcurrent, timeout, abortOnError, addError]);

  const pullAll = useCallback(async (repositories: RepositoryInfo[]) => {
    await executeOperation('pull', repositories);
  }, [executeOperation]);

  const pushAll = useCallback(async (repositories: RepositoryInfo[]) => {
    await executeOperation('push', repositories);
  }, [executeOperation]);

  const fetchAll = useCallback(async (repositories: RepositoryInfo[]) => {
    await executeOperation('fetch', repositories);
  }, [executeOperation]);

  const syncAll = useCallback(async (repositories: RepositoryInfo[]) => {
    await executeOperation('sync', repositories);
  }, [executeOperation]);

  const checkoutBranchAll = useCallback(async (repositories: RepositoryInfo[], branchName: string) => {
    await executeOperation('checkout', repositories, { branch: branchName });
  }, [executeOperation]);

  const createBranchAll = useCallback(async (repositories: RepositoryInfo[], branchName: string, fromBranch?: string) => {
    await executeOperation('create_branch', repositories, { branch: branchName, from_branch: fromBranch });
  }, [executeOperation]);

  const deleteBranchAll = useCallback(async (repositories: RepositoryInfo[], branchName: string, force: boolean = false) => {
    await executeOperation('delete_branch', repositories, { branch: branchName, force });
  }, [executeOperation]);

  const getStatusAll = useCallback(async (repositories: RepositoryInfo[]) => {
    await executeOperation('status', repositories);
  }, [executeOperation]);

  const stashAll = useCallback(async (repositories: RepositoryInfo[], message?: string) => {
    await executeOperation('stash', repositories, { message });
  }, [executeOperation]);

  const resetHardAll = useCallback(async (repositories: RepositoryInfo[], target: string = 'HEAD') => {
    await executeOperation('reset_hard', repositories, { target });
  }, [executeOperation]);

  const cleanAll = useCallback(async (repositories: RepositoryInfo[], force: boolean = false) => {
    await executeOperation('clean', repositories, { force });
  }, [executeOperation]);

  const abortOperation = useCallback(() => {
    if (currentOperationIdRef.current) {
      bulkOperations.abortOperation(currentOperationIdRef.current);
      setIsRunning(false);
      setError('Operation was aborted');
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults(new Map());
    setProgress(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getValidRepositories = useCallback((repositories: RepositoryInfo[]) => {
    const { valid } = bulkOperations.validateRepositories(repositories);
    return valid;
  }, []);

  const getInvalidRepositories = useCallback((repositories: RepositoryInfo[]) => {
    const { invalid } = bulkOperations.validateRepositories(repositories);
    return invalid;
  }, []);

  const getOperationStats = useCallback(() => {
    if (results.size === 0) return null;
    return bulkOperations.getOperationStats(results);
  }, [results]);

  return {
    // State
    isRunning,
    progress,
    results,
    error,
    
    // Operations
    pullAll,
    pushAll,
    fetchAll,
    syncAll,
    checkoutBranchAll,
    createBranchAll,
    deleteBranchAll,
    getStatusAll,
    stashAll,
    resetHardAll,
    cleanAll,
    
    // Control
    abortOperation,
    clearResults,
    clearError,
    
    // Utilities
    getValidRepositories,
    getInvalidRepositories,
    getOperationStats
  };
};

export default useBulkOperations;