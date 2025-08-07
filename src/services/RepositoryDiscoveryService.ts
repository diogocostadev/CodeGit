import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { RepositoryInfo, Organization, OrganizationGrouping, WorkspaceInfo } from '../types/state';

class RepositoryDiscoveryService {
  private watchers: Map<string, boolean> = new Map();
  private callbacks: Map<string, (repos: RepositoryInfo[]) => void> = new Map();

  /**
   * Scan a directory for Git repositories
   */
  async scanDirectory(path: string, maxDepth: number = 3): Promise<RepositoryInfo[]> {
    try {
      const result = await invoke<any[]>('scan_repositories', { path, maxDepth });
      return result.map(repo => this.mapToRepositoryInfo(repo));
    } catch (error) {
      console.error('Failed to scan directory:', error);
      return [];
    }
  }

  /**
   * Detect repositories from multiple paths
   */
  async detectRepositories(paths: string[]): Promise<RepositoryInfo[]> {
    const allRepos: RepositoryInfo[] = [];
    
    for (const path of paths) {
      const repos = await this.scanDirectory(path);
      allRepos.push(...repos);
    }

    // Remove duplicates based on path
    const uniqueRepos = allRepos.filter((repo, index, self) => 
      index === self.findIndex(r => r.path === repo.path)
    );

    return uniqueRepos;
  }

  /**
   * Watch directories for new repositories
   */
  async watchForChanges(paths: string[], callback: (repos: RepositoryInfo[]) => void): Promise<void> {
    const watchId = Date.now().toString();
    this.callbacks.set(watchId, callback);

    try {
      // Register Tauri file watcher
      for (const path of paths) {
        if (!this.watchers.has(path)) {
          await invoke('watch_directory', { path });
          this.watchers.set(path, true);
        }
      }

      // Listen for file system events
      const unlisten = await listen('repository-discovered', (event) => {
        const repo = this.mapToRepositoryInfo(event.payload);
        callback([repo]);
      });

      // Store unlisten function for cleanup
      (this.callbacks as any).set(`${watchId}_unlisten`, unlisten);

    } catch (error) {
      console.error('Failed to watch directories:', error);
    }
  }

  /**
   * Stop watching for changes
   */
  stopWatching(): void {
    // Clean up watchers
    this.watchers.clear();
    
    // Clean up callbacks and listeners
    this.callbacks.forEach((callback, key) => {
      if (key.endsWith('_unlisten') && typeof callback === 'function') {
        callback();
      }
    });
    this.callbacks.clear();

    // Stop Tauri watchers
    invoke('stop_watching').catch(error => {
      console.error('Failed to stop watching:', error);
    });
  }

  /**
   * Group repositories by organization based on various heuristics
   */
  async groupByOrganization(repos: RepositoryInfo[]): Promise<OrganizationGrouping> {
    const organizations: Array<{
      id: string;
      name: string;
      repositories: string[];
      confidence: number;
      detection_method: 'domain' | 'path' | 'remote' | 'manual';
    }> = [];

    const ungrouped: string[] = [];
    const orgMap = new Map<string, typeof organizations[0]>();

    for (const repo of repos) {
      const orgInfo = this.detectOrganization(repo);
      
      if (orgInfo) {
        const key = orgInfo.name.toLowerCase();
        if (orgMap.has(key)) {
          // Add to existing organization
          const org = orgMap.get(key)!;
          org.repositories.push(repo.id);
          org.confidence = Math.max(org.confidence, orgInfo.confidence);
        } else {
          // Create new organization
          const org = {
            id: this.generateOrgId(orgInfo.name),
            name: orgInfo.name,
            repositories: [repo.id],
            confidence: orgInfo.confidence,
            detection_method: orgInfo.method
          };
          orgMap.set(key, org);
          organizations.push(org);
        }
      } else {
        ungrouped.push(repo.id);
      }
    }

    return { organizations, ungrouped };
  }

  /**
   * Detect workspaces from repositories
   */
  async detectWorkspaces(repos: RepositoryInfo[]): Promise<WorkspaceInfo[]> {
    const workspaces: WorkspaceInfo[] = [];
    const pathGroups = new Map<string, RepositoryInfo[]>();

    // Group repositories by common parent directories
    for (const repo of repos) {
      const parentPath = this.getParentPath(repo.path, 2); // Go up 2 levels
      if (!pathGroups.has(parentPath)) {
        pathGroups.set(parentPath, []);
      }
      pathGroups.get(parentPath)!.push(repo);
    }

    // Create workspaces for groups with multiple repositories
    pathGroups.forEach((repoGroup, parentPath) => {
      if (repoGroup.length > 1) {
        const workspace: WorkspaceInfo = {
          id: this.generateWorkspaceId(parentPath),
          name: this.extractDirectoryName(parentPath),
          path: parentPath,
          repositories: repoGroup.map(r => r.id),
          type: this.detectWorkspaceType(repoGroup),
          confidence: this.calculateWorkspaceConfidence(repoGroup)
        };
        workspaces.push(workspace);
      }
    });

    return workspaces;
  }

  /**
   * Add a single repository
   */
  async addRepository(path: string): Promise<RepositoryInfo> {
    try {
      const result = await invoke<any>('add_repository', { path });
      return this.mapToRepositoryInfo(result);
    } catch (error) {
      console.error('Failed to add repository:', error);
      throw error;
    }
  }

  /**
   * Remove a repository
   */
  async removeRepository(repoId: string): Promise<boolean> {
    try {
      await invoke('remove_repository', { repoId });
      return true;
    } catch (error) {
      console.error('Failed to remove repository:', error);
      return false;
    }
  }

  /**
   * Update repository information
   */
  async updateRepository(repoId: string): Promise<RepositoryInfo> {
    try {
      const result = await invoke<any>('update_repository', { repoId });
      return this.mapToRepositoryInfo(result);
    } catch (error) {
      console.error('Failed to update repository:', error);
      throw error;
    }
  }

  // Private helper methods

  private mapToRepositoryInfo(data: any): RepositoryInfo {
    return {
      id: data.id || this.generateRepoId(data.path || data.name),
      name: data.name || this.extractDirectoryName(data.path),
      path: data.path,
      current_branch: data.current_branch || 'main',
      last_commit: data.last_commit || '',
      is_dirty: data.is_dirty || false,
      last_accessed: data.last_accessed || Date.now(),
      
      // Extended fields with defaults
      organization_id: data.organization_id,
      remote_url: data.remote_url,
      remote_origin: data.remote_origin,
      ahead_count: data.ahead_count || 0,
      behind_count: data.behind_count || 0,
      last_fetch: data.last_fetch || 0,
      last_push: data.last_push || 0,
      has_conflicts: data.has_conflicts || false,
      stash_count: data.stash_count || 0,
      
      sync_status: data.sync_status || 'up_to_date',
      working_status: data.working_status || 'clean',
      
      unpushed_commits: data.unpushed_commits || 0,
      unpulled_commits: data.unpulled_commits || 0,
      modified_files: data.modified_files || 0,
      staged_files: data.staged_files || 0,
      untracked_files: data.untracked_files || 0,
      
      description: data.description,
      tags: data.tags || [],
      is_favorite: data.is_favorite || false,
      last_build_status: data.last_build_status,
      default_branch: data.default_branch || 'main',
      branches: data.branches || [],
      remotes: data.remotes || [],
      
      repo_size: data.repo_size || 0,
      file_count: data.file_count || 0,
      commit_count: data.commit_count || 0
    };
  }

  private detectOrganization(repo: RepositoryInfo): { 
    name: string; 
    confidence: number; 
    method: 'domain' | 'path' | 'remote' | 'manual' 
  } | null {
    // Try to detect from remote URL
    if (repo.remote_url) {
      const domainMatch = repo.remote_url.match(/github\.com[/:]([\w-]+)/);
      if (domainMatch) {
        return {
          name: domainMatch[1],
          confidence: 0.9,
          method: 'remote'
        };
      }

      const gitlabMatch = repo.remote_url.match(/gitlab\.com[/:]([\w-]+)/);
      if (gitlabMatch) {
        return {
          name: gitlabMatch[1],
          confidence: 0.9,
          method: 'remote'
        };
      }
    }

    // Try to detect from path structure
    const pathParts = repo.path.split(/[/\\]/);
    if (pathParts.length >= 3) {
      const possibleOrg = pathParts[pathParts.length - 3];
      // Look for common organization indicators
      if (/^(projects|repos|code|src|dev|work|companies?)$/i.test(possibleOrg)) {
        const orgName = pathParts[pathParts.length - 2];
        return {
          name: orgName,
          confidence: 0.6,
          method: 'path'
        };
      }
    }

    return null;
  }

  private detectWorkspaceType(repos: RepositoryInfo[]): 'monorepo' | 'multi-repo' | 'organization' {
    if (repos.length === 1) return 'monorepo';
    
    // Check if repositories share common patterns
    const commonDomains = new Set();
    repos.forEach(repo => {
      if (repo.remote_url) {
        const domain = repo.remote_url.match(/([^/:]+\.[^/:]+)/)?.[1];
        if (domain) commonDomains.add(domain);
      }
    });

    if (commonDomains.size === 1) return 'organization';
    return 'multi-repo';
  }

  private calculateWorkspaceConfidence(repos: RepositoryInfo[]): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence if repositories have similar naming patterns
    const names = repos.map(r => r.name);
    const commonPrefix = this.findCommonPrefix(names);
    if (commonPrefix.length > 2) confidence += 0.2;

    // Higher confidence if repositories share the same remote domain
    const domains = new Set(repos.map(r => 
      r.remote_url?.match(/([^/:]+\.[^/:]+)/)?.[1]
    ).filter(Boolean));
    if (domains.size === 1) confidence += 0.3;

    return Math.min(confidence, 1.0);
  }

  private findCommonPrefix(strings: string[]): string {
    if (strings.length === 0) return '';
    
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
      while (strings[i].indexOf(prefix) !== 0) {
        prefix = prefix.substring(0, prefix.length - 1);
        if (prefix === '') return '';
      }
    }
    return prefix;
  }

  private getParentPath(path: string, levels: number): string {
    const parts = path.split(/[/\\]/);
    return parts.slice(0, -levels).join('/');
  }

  private extractDirectoryName(path: string): string {
    return path.split(/[/\\]/).pop() || 'Unknown';
  }

  private generateRepoId(path: string): string {
    return `repo_${this.generateId(path)}`;
  }

  private generateOrgId(name: string): string {
    return `org_${this.generateId(name)}`;
  }

  private generateWorkspaceId(path: string): string {
    return `workspace_${this.generateId(path)}`;
  }

  private generateId(input: string): string {
    // Simple hash function for generating IDs
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Export singleton instance
export const repositoryDiscovery = new RepositoryDiscoveryService();
export default repositoryDiscovery;