import { invoke } from '@tauri-apps/api/tauri';
import { RepositoryInfo, BulkOperationResult, BulkOperationProgress } from '../types/operations';

export interface BulkOperationOptions {
  maxConcurrent?: number;
  timeout?: number;
  abortOnError?: boolean;
  notifyProgress?: (progress: BulkOperationProgress) => void;
}

export interface BulkExecutionContext {
  repositories: RepositoryInfo[];
  operation: string;
  options: BulkOperationOptions;
  results: Map<string, BulkOperationResult>;
  abortController?: AbortController;
}

class BulkOperationsService {
  private activeOperations = new Map<string, BulkExecutionContext>();

  /**
   * Execute a bulk operation across multiple repositories
   */
  async executeBulkOperation(
    repositories: RepositoryInfo[],
    operation: string,
    operationParams: Record<string, any> = {},
    options: BulkOperationOptions = {}
  ): Promise<Map<string, BulkOperationResult>> {
    const {
      maxConcurrent = 3,
      timeout = 30000,
      abortOnError = false,
      notifyProgress
    } = options;

    const operationId = `${operation}-${Date.now()}`;
    const context: BulkExecutionContext = {
      repositories,
      operation,
      options,
      results: new Map(),
      abortController: new AbortController()
    };

    this.activeOperations.set(operationId, context);

    try {
      // Initialize results
      repositories.forEach(repo => {
        context.results.set(repo.id, {
          repository_id: repo.id,
          repository_name: repo.name,
          status: 'pending',
          started_at: Date.now()
        });
      });

      // Notify initial progress
      if (notifyProgress) {
        notifyProgress({
          operation_id: operationId,
          operation_name: operation,
          total: repositories.length,
          completed: 0,
          failed: 0,
          pending: repositories.length,
          results: new Map(context.results)
        });
      }

      // Execute operations in batches
      const batches = this.createBatches(repositories, maxConcurrent);
      let completedCount = 0;

      for (const batch of batches) {
        if (context.abortController?.signal.aborted) break;

        const batchPromises = batch.map(repo => 
          this.executeRepositoryOperation(repo, operation, operationParams, timeout, context)
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          const repo = batch[index];
          completedCount++;

          if (result.status === 'fulfilled') {
            context.results.set(repo.id, result.value);
          } else {
            context.results.set(repo.id, {
              repository_id: repo.id,
              repository_name: repo.name,
              status: 'error',
              error: result.reason?.message || 'Unknown error',
              started_at: context.results.get(repo.id)?.started_at || Date.now(),
              completed_at: Date.now()
            });
          }

          // Check if we should abort on error
          if (abortOnError && result.status === 'rejected') {
            context.abortController?.abort();
          }
        });

        // Notify progress after each batch
        if (notifyProgress) {
          const results = Array.from(context.results.values());
          notifyProgress({
            operation_id: operationId,
            operation_name: operation,
            total: repositories.length,
            completed: results.filter(r => r.status === 'completed').length,
            failed: results.filter(r => r.status === 'error').length,
            pending: results.filter(r => r.status === 'pending').length,
            results: new Map(context.results)
          });
        }
      }

      return context.results;

    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Pull all repositories
   */
  async pullAll(repositories: RepositoryInfo[], options: BulkOperationOptions = {}): Promise<Map<string, BulkOperationResult>> {
    return this.executeBulkOperation(repositories, 'pull', {}, options);
  }

  /**
   * Push all repositories
   */
  async pushAll(repositories: RepositoryInfo[], options: BulkOperationOptions = {}): Promise<Map<string, BulkOperationResult>> {
    return this.executeBulkOperation(repositories, 'push', {}, options);
  }

  /**
   * Fetch all repositories
   */
  async fetchAll(repositories: RepositoryInfo[], options: BulkOperationOptions = {}): Promise<Map<string, BulkOperationResult>> {
    return this.executeBulkOperation(repositories, 'fetch', {}, options);
  }

  /**
   * Checkout branch for all repositories
   */
  async checkoutBranchAll(
    repositories: RepositoryInfo[], 
    branchName: string, 
    options: BulkOperationOptions = {}
  ): Promise<Map<string, BulkOperationResult>> {
    return this.executeBulkOperation(repositories, 'checkout', { branch: branchName }, options);
  }

  /**
   * Create branch for all repositories
   */
  async createBranchAll(
    repositories: RepositoryInfo[], 
    branchName: string, 
    fromBranch?: string, 
    options: BulkOperationOptions = {}
  ): Promise<Map<string, BulkOperationResult>> {
    return this.executeBulkOperation(repositories, 'create_branch', { 
      branch: branchName, 
      from_branch: fromBranch 
    }, options);
  }

  /**
   * Delete branch for all repositories
   */
  async deleteBranchAll(
    repositories: RepositoryInfo[], 
    branchName: string, 
    force: boolean = false,
    options: BulkOperationOptions = {}
  ): Promise<Map<string, BulkOperationResult>> {
    return this.executeBulkOperation(repositories, 'delete_branch', { 
      branch: branchName,
      force 
    }, options);
  }

  /**
   * Get status for all repositories
   */
  async getStatusAll(repositories: RepositoryInfo[], options: BulkOperationOptions = {}): Promise<Map<string, BulkOperationResult>> {
    return this.executeBulkOperation(repositories, 'status', {}, options);
  }

  /**
   * Sync all repositories (fetch + pull if possible)
   */
  async syncAll(repositories: RepositoryInfo[], options: BulkOperationOptions = {}): Promise<Map<string, BulkOperationResult>> {
    return this.executeBulkOperation(repositories, 'sync', {}, options);
  }

  /**
   * Stash changes for all repositories
   */
  async stashAll(
    repositories: RepositoryInfo[], 
    message?: string, 
    options: BulkOperationOptions = {}
  ): Promise<Map<string, BulkOperationResult>> {
    return this.executeBulkOperation(repositories, 'stash', { message }, options);
  }

  /**
   * Reset hard for all repositories
   */
  async resetHardAll(
    repositories: RepositoryInfo[], 
    target: string = 'HEAD', 
    options: BulkOperationOptions = {}
  ): Promise<Map<string, BulkOperationResult>> {
    return this.executeBulkOperation(repositories, 'reset_hard', { target }, options);
  }

  /**
   * Clean untracked files for all repositories
   */
  async cleanAll(
    repositories: RepositoryInfo[], 
    force: boolean = false,
    options: BulkOperationOptions = {}
  ): Promise<Map<string, BulkOperationResult>> {
    return this.executeBulkOperation(repositories, 'clean', { force }, options);
  }

  /**
   * Abort a running bulk operation
   */
  abortOperation(operationId: string): boolean {
    const context = this.activeOperations.get(operationId);
    if (context) {
      context.abortController?.abort();
      return true;
    }
    return false;
  }

  /**
   * Get active operations
   */
  getActiveOperations(): string[] {
    return Array.from(this.activeOperations.keys());
  }

  /**
   * Check if an operation is running
   */
  isOperationRunning(operationId: string): boolean {
    return this.activeOperations.has(operationId);
  }

  // Private helper methods

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async executeRepositoryOperation(
    repository: RepositoryInfo,
    operation: string,
    params: Record<string, any>,
    timeout: number,
    context: BulkExecutionContext
  ): Promise<BulkOperationResult> {
    const startTime = Date.now();

    try {
      // Check if operation was aborted
      if (context.abortController?.signal.aborted) {
        throw new Error('Operation aborted');
      }

      // Update status to running
      context.results.set(repository.id, {
        repository_id: repository.id,
        repository_name: repository.name,
        status: 'running',
        started_at: startTime
      });

      // Execute the actual Git operation via Tauri
      const result = await Promise.race([
        invoke(`git_${operation}`, { 
          repositoryPath: repository.path,
          ...params 
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), timeout)
        )
      ]);

      const completedAt = Date.now();

      return {
        repository_id: repository.id,
        repository_name: repository.name,
        status: 'completed',
        result,
        started_at: startTime,
        completed_at: completedAt,
        duration: completedAt - startTime
      };

    } catch (error: any) {
      const completedAt = Date.now();

      return {
        repository_id: repository.id,
        repository_name: repository.name,
        status: 'error',
        error: error.message || 'Unknown error',
        started_at: startTime,
        completed_at: completedAt,
        duration: completedAt - startTime
      };
    }
  }

  /**
   * Validate repositories before bulk operation
   */
  validateRepositories(repositories: RepositoryInfo[]): {
    valid: RepositoryInfo[];
    invalid: { repository: RepositoryInfo; reason: string }[];
  } {
    const valid: RepositoryInfo[] = [];
    const invalid: { repository: RepositoryInfo; reason: string }[] = [];

    repositories.forEach(repo => {
      if (!repo.path) {
        invalid.push({ repository: repo, reason: 'Missing repository path' });
      } else if (repo.sync_status === 'error') {
        invalid.push({ repository: repo, reason: 'Repository in error state' });
      } else {
        valid.push(repo);
      }
    });

    return { valid, invalid };
  }

  /**
   * Get operation statistics
   */
  getOperationStats(results: Map<string, BulkOperationResult>): {
    total: number;
    completed: number;
    failed: number;
    avgDuration: number;
    totalDuration: number;
  } {
    const resultArray = Array.from(results.values());
    const completed = resultArray.filter(r => r.status === 'completed');
    const failed = resultArray.filter(r => r.status === 'error');
    
    const durations = resultArray
      .filter(r => r.duration !== undefined)
      .map(r => r.duration!);
    
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const avgDuration = durations.length > 0 ? totalDuration / durations.length : 0;

    return {
      total: resultArray.length,
      completed: completed.length,
      failed: failed.length,
      avgDuration: Math.round(avgDuration),
      totalDuration
    };
  }
}

// Export singleton instance
export const bulkOperations = new BulkOperationsService();
export default bulkOperations;