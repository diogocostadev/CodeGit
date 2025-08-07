// ===== BULK OPERATIONS & SERVICE INTERFACES =====

import { RepositoryInfo, BulkOperation, BulkOperationResult } from './state';

// Bulk operations interface
export interface BulkActions {
  // Core Git operations
  pullAll(repoIds: string[]): Promise<BulkResult>;
  pushAll(repoIds: string[]): Promise<BulkResult>;
  fetchAll(repoIds: string[]): Promise<BulkResult>;
  checkoutBranch(repoIds: string[], branch: string): Promise<BulkResult>;
  
  // Extended operations
  stashAll(repoIds: string[]): Promise<BulkResult>;
  cleanAll(repoIds: string[]): Promise<BulkResult>;
  syncAll(repoIds: string[]): Promise<BulkResult>;
  
  // Status operations
  getStatusAll(repoIds: string[]): Promise<BulkStatusResult>;
  refreshAll(repoIds: string[]): Promise<BulkResult>;
  
  // Batch operations
  executeBatch(operations: BatchOperation[]): Promise<BatchResult>;
}

export interface BulkResult {
  operation_id: string;
  total_repos: number;
  successful: number;
  failed: number;
  skipped: number;
  results: BulkOperationResult[];
  duration: number;
  started_at: number;
  completed_at: number;
}

export interface BulkStatusResult {
  repositories: Record<string, RepositoryStatusInfo>;
  summary: {
    total: number;
    clean: number;
    modified: number;
    ahead: number;
    behind: number;
    conflicted: number;
  };
}

export interface RepositoryStatusInfo {
  id: string;
  sync_status: 'up_to_date' | 'ahead' | 'behind' | 'diverged' | 'error';
  working_status: 'clean' | 'modified' | 'staged' | 'conflicted';
  ahead_count: number;
  behind_count: number;
  modified_files: number;
  staged_files: number;
  stash_count: number;
  last_updated: number;
}

export interface BatchOperation {
  type: 'git' | 'file' | 'custom';
  command: string;
  repository_id: string;
  parameters?: Record<string, any>;
  depends_on?: string[]; // Operation IDs this depends on
}

export interface BatchResult {
  operation_id: string;
  operations: BatchOperationResult[];
  total_duration: number;
  dependency_graph: DependencyGraph;
}

export interface BatchOperationResult {
  operation_id: string;
  repository_id: string;
  status: 'success' | 'failed' | 'skipped';
  output?: string;
  error?: string;
  duration: number;
}

export interface DependencyGraph {
  nodes: string[];
  edges: Array<[string, string]>; // [from, to]
  execution_order: string[];
}

// Repository discovery and management
export interface RepositoryDiscovery {
  // Discovery methods
  scanDirectory(path: string, maxDepth?: number): Promise<RepositoryInfo[]>;
  detectRepositories(paths: string[]): Promise<RepositoryInfo[]>;
  watchForChanges(paths: string[], callback: (repos: RepositoryInfo[]) => void): void;
  stopWatching(): void;
  
  // Auto-grouping
  groupByOrganization(repos: RepositoryInfo[]): Promise<OrganizationGrouping>;
  detectWorkspaces(repos: RepositoryInfo[]): Promise<WorkspaceInfo[]>;
  
  // Repository operations
  addRepository(path: string): Promise<RepositoryInfo>;
  removeRepository(repoId: string): Promise<boolean>;
  updateRepository(repoId: string): Promise<RepositoryInfo>;
}

export interface OrganizationGrouping {
  organizations: Array<{
    id: string;
    name: string;
    repositories: string[];
    confidence: number; // 0-1, how sure we are about this grouping
    detection_method: 'domain' | 'path' | 'remote' | 'manual';
  }>;
  ungrouped: string[];
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  path: string;
  repositories: string[];
  type: 'monorepo' | 'multi-repo' | 'organization';
  confidence: number;
}

// Git operations interface
export interface GitOperations {
  // Repository management
  cloneRepository(url: string, path: string): Promise<RepositoryInfo>;
  initRepository(path: string): Promise<RepositoryInfo>;
  
  // Branch operations
  createBranch(repoId: string, name: string, startPoint?: string): Promise<void>;
  deleteBranch(repoId: string, name: string, force?: boolean): Promise<void>;
  mergeBranch(repoId: string, branch: string, strategy?: MergeStrategy): Promise<MergeResult>;
  rebaseBranch(repoId: string, onto: string, branch?: string): Promise<RebaseResult>;
  
  // Commit operations
  commit(repoId: string, message: string, files?: string[]): Promise<CommitResult>;
  amendCommit(repoId: string, message?: string): Promise<CommitResult>;
  revertCommit(repoId: string, commitId: string): Promise<CommitResult>;
  cherryPick(repoId: string, commitId: string): Promise<CommitResult>;
  
  // Remote operations
  addRemote(repoId: string, name: string, url: string): Promise<void>;
  removeRemote(repoId: string, name: string): Promise<void>;
  push(repoId: string, remote?: string, branch?: string): Promise<PushResult>;
  pull(repoId: string, remote?: string, branch?: string): Promise<PullResult>;
  fetch(repoId: string, remote?: string): Promise<FetchResult>;
  
  // Stash operations
  stash(repoId: string, message?: string, includeUntracked?: boolean): Promise<StashResult>;
  stashPop(repoId: string, index?: number): Promise<StashResult>;
  stashApply(repoId: string, index?: number): Promise<StashResult>;
  stashDrop(repoId: string, index?: number): Promise<void>;
  
  // File operations
  addFiles(repoId: string, files: string[]): Promise<void>;
  resetFiles(repoId: string, files: string[], mode?: ResetMode): Promise<void>;
  discardChanges(repoId: string, files: string[]): Promise<void>;
  
  // Information gathering
  getCommitHistory(repoId: string, options?: HistoryOptions): Promise<CommitInfo[]>;
  getBranches(repoId: string): Promise<BranchInfo[]>;
  getTags(repoId: string): Promise<TagInfo[]>;
  getRemotes(repoId: string): Promise<RemoteInfo[]>;
  getStatus(repoId: string): Promise<StatusInfo>;
  getDiff(repoId: string, options?: DiffOptions): Promise<DiffInfo>;
}

export type MergeStrategy = 'resolve' | 'recursive' | 'octopus' | 'ours' | 'subtree';
export type ResetMode = 'soft' | 'mixed' | 'hard';

export interface MergeResult {
  success: boolean;
  conflicts?: ConflictInfo[];
  message: string;
}

export interface RebaseResult {
  success: boolean;
  conflicts?: ConflictInfo[];
  current_commit?: string;
  remaining_commits: number;
}

export interface CommitResult {
  commit_id: string;
  message: string;
  files_changed: number;
}

export interface PushResult {
  success: boolean;
  pushed_refs: string[];
  rejected_refs?: string[];
  error?: string;
}

export interface PullResult {
  success: boolean;
  updated_refs: string[];
  conflicts?: ConflictInfo[];
  fast_forward: boolean;
}

export interface FetchResult {
  success: boolean;
  updated_refs: string[];
  new_refs: string[];
  deleted_refs: string[];
}

export interface StashResult {
  success: boolean;
  stash_id?: string;
  message?: string;
}

export interface ConflictInfo {
  file_path: string;
  type: 'content' | 'delete' | 'add' | 'rename';
  our_mode?: string;
  their_mode?: string;
}

export interface HistoryOptions {
  limit?: number;
  offset?: number;
  author?: string;
  since?: Date;
  until?: Date;
  path?: string;
  branch?: string;
  merge_commits?: boolean;
}

export interface BranchInfo {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  upstream?: string;
  ahead_count: number;
  behind_count: number;
  last_commit: CommitInfo;
}

export interface TagInfo {
  name: string;
  target: string;
  message?: string;
  tagger?: {
    name: string;
    email: string;
    timestamp: number;
  };
  is_annotated: boolean;
}

export interface RemoteInfo {
  name: string;
  url: string;
  fetch_url: string;
  push_url: string;
}

export interface StatusInfo {
  current_branch?: string;
  staged_files: FileStatus[];
  unstaged_files: FileStatus[];
  untracked_files: string[];
  conflicted_files: string[];
  ahead_count: number;
  behind_count: number;
}

export interface FileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'typechange';
  old_path?: string; // For renames
  similarity?: number; // For renames/copies
}

export interface DiffOptions {
  staged?: boolean;
  commit1?: string;
  commit2?: string;
  path?: string;
  context_lines?: number;
}

export interface DiffInfo {
  files: FileDiff[];
  total_insertions: number;
  total_deletions: number;
  total_files: number;
}

export interface FileDiff {
  path: string;
  old_path?: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied';
  insertions: number;
  deletions: number;
  chunks: DiffChunk[];
  is_binary: boolean;
}

export interface DiffChunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  old_line_number?: number;
  new_line_number?: number;
}

// Commit information
export interface CommitInfo {
  id: string;
  short_id: string;
  message: string;
  author: PersonInfo;
  committer: PersonInfo;
  timestamp: number;
  parents: string[];
  tree: string;
  stats?: {
    files_changed: number;
    insertions: number;
    deletions: number;
  };
  branches?: string[];
  tags?: string[];
}

export interface PersonInfo {
  name: string;
  email: string;
  timestamp: number;
  timezone: string;
}

// Search operations
export interface SearchOperations {
  // Repository-wide search
  searchInRepository(repoId: string, query: string, options?: SearchOptions): Promise<SearchResult[]>;
  searchAcrossRepositories(repoIds: string[], query: string, options?: SearchOptions): Promise<SearchResult[]>;
  
  // Commit search
  searchCommits(repoId: string, query: string, options?: CommitSearchOptions): Promise<CommitInfo[]>;
  
  // File search
  searchFiles(repoId: string, pattern: string, options?: FileSearchOptions): Promise<string[]>;
  
  // Advanced search
  searchWithFilters(filter: SearchFilter): Promise<SearchResult[]>;
}

export interface SearchOptions {
  case_sensitive?: boolean;
  regex?: boolean;
  whole_word?: boolean;
  include_binary?: boolean;
  file_pattern?: string;
  exclude_pattern?: string;
  max_results?: number;
}

export interface CommitSearchOptions {
  author?: string;
  message?: string;
  date_range?: [Date, Date];
  branch?: string;
}

export interface FileSearchOptions {
  include_extensions?: string[];
  exclude_extensions?: string[];
  include_directories?: string[];
  exclude_directories?: string[];
}

export interface SearchFilter {
  query: string;
  repositories?: string[];
  file_types?: string[];
  authors?: string[];
  date_range?: [Date, Date];
  branches?: string[];
}

export interface SearchResult {
  repository_id: string;
  file_path: string;
  line_number: number;
  column_start: number;
  column_end: number;
  content: string;
  context_before?: string[];
  context_after?: string[];
  match_score: number;
}

// Performance monitoring
export interface PerformanceMonitor {
  startOperation(name: string, repository_id?: string): string; // Returns operation ID
  endOperation(operation_id: string, success: boolean, metadata?: any): void;
  recordMetric(name: string, value: number, labels?: Record<string, string>): void;
  getMetrics(timeRange?: [Date, Date]): PerformanceMetrics;
  exportMetrics(format: 'json' | 'csv'): Promise<string>;
}

export interface PerformanceMetrics {
  operations: OperationMetric[];
  system: SystemMetrics;
  git_operations: GitOperationMetrics;
  ui_metrics: UIMetrics;
  cache_metrics: CacheMetrics;
}

export interface OperationMetric {
  id: string;
  name: string;
  repository_id?: string;
  duration: number;
  success: boolean;
  timestamp: number;
  metadata?: any;
}

export interface SystemMetrics {
  memory_usage: number;
  cpu_usage: number;
  disk_usage: number;
  network_io: number;
  open_file_handles: number;
}

export interface GitOperationMetrics {
  total_operations: number;
  average_duration: number;
  success_rate: number;
  most_common_operations: Array<{ name: string; count: number }>;
  slowest_operations: Array<{ name: string; duration: number; repository_id?: string }>;
}

export interface UIMetrics {
  render_times: number[];
  user_interactions: number;
  error_rate: number;
  crash_count: number;
}

export interface CacheMetrics {
  hit_rate: number;
  miss_rate: number;
  size: number;
  evictions: number;
  memory_usage: number;
}

// Notification system
export interface NotificationSystem {
  subscribe(type: 'all' | 'repository' | 'system', callback: NotificationCallback): string; // Returns subscription ID
  unsubscribe(subscription_id: string): void;
  
  notify(notification: NotificationOptions): void;
  showToast(message: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number): void;
  
  // Built-in notification types
  notifyConflict(repository_id: string, files: string[]): void;
  notifyPushSuccess(repository_id: string, pushed_refs: string[]): void;
  notifyPushFailure(repository_id: string, error: string): void;
  notifyBulkOperationComplete(operation_id: string, results: BulkResult): void;
}

export interface NotificationOptions {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  repository_id?: string;
  actions?: NotificationAction[];
  persistent?: boolean;
  duration?: number;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

export type NotificationCallback = (notification: NotificationOptions) => void;