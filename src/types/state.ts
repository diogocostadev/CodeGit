// ===== GLOBAL STATE ARCHITECTURE =====

// Core workspace structure
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  color?: string;
  organizations: Organization[];
  repositories: Record<string, RepositoryInfo>;
  last_accessed: number;
  created_at: number;
}

// Organization grouping system
export interface Organization {
  id: string;
  name: string;
  color: string;
  description?: string;
  avatar?: string;
  repositories: string[]; // Repository IDs
  settings: OrganizationSettings;
  created_at: number;
  updated_at: number;
}

export interface OrganizationSettings {
  auto_fetch_interval: number; // minutes
  auto_group_by_domain: boolean;
  default_branch_protection: boolean;
  notification_preferences: NotificationSettings;
}

// Enhanced repository information
export interface RepositoryInfo {
  // Core existing fields
  id: string;
  name: string;
  path: string;
  current_branch: string;
  last_commit: string;
  is_dirty: boolean;
  last_accessed: number;
  
  // NEW: Enterprise features
  organization_id?: string;
  remote_url?: string;
  remote_origin?: string;
  ahead_count: number;
  behind_count: number;
  last_fetch: number;
  last_push: number;
  has_conflicts: boolean;
  stash_count: number;
  
  // NEW: Status indicators
  sync_status: SyncStatus;
  working_status: WorkingStatus;
  
  // NEW: Quick stats
  unpushed_commits: number;
  unpulled_commits: number;
  modified_files: number;
  staged_files: number;
  untracked_files: number;
  
  // NEW: Metadata
  description?: string;
  tags: string[];
  is_favorite: boolean;
  last_build_status?: BuildStatus;
  default_branch: string;
  branches: string[];
  remotes: Remote[];
  
  // NEW: Performance tracking
  repo_size: number; // bytes
  file_count: number;
  commit_count: number;
}

// Status enums
export type SyncStatus = 'up_to_date' | 'ahead' | 'behind' | 'diverged' | 'error' | 'syncing';
export type WorkingStatus = 'clean' | 'modified' | 'staged' | 'conflicted' | 'untracked';
export type BuildStatus = 'success' | 'failed' | 'running' | 'unknown';

// Remote configuration
export interface Remote {
  name: string;
  url: string;
  fetch_url: string;
  push_url: string;
}

// Main view system
export type MainViewMode = 
  | 'history'      // Commit graph + timeline
  | 'changes'      // Working directory changes
  | 'branches'     // Branch management
  | 'merge'        // Merge/rebase operations
  | 'conflicts'    // Conflict resolution
  | 'remotes'      // Remote management
  | 'timeline'     // Cross-repo timeline
  | 'stashes'      // Stash management
  | 'tags'         // Tag management
  | 'blame'        // File blame view
  | 'search';      // Repository-wide search

export interface MainViewState {
  mode: MainViewMode;
  selectedRepo?: string;
  selectedCommit?: string;
  selectedFile?: string;
  selectedBranch?: string;
  filter: ViewFilter;
  search_query?: string;
  context_data?: any;
}

// Filtering system
export interface ViewFilter {
  author?: string;
  date_range?: DateRange;
  branch?: string;
  file_pattern?: string;
  message_pattern?: string;
  commit_type?: CommitType[];
  organization?: string;
  tags?: string[];
}

export interface DateRange {
  start: number;
  end: number;
}

export type CommitType = 'merge' | 'feature' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';

// Details panel system
export interface DetailsPanelState {
  type: DetailsPanelType;
  data: any;
  actions: Action[];
  is_collapsed: boolean;
  width: number;
}

export type DetailsPanelType = 
  | 'file_diff' 
  | 'commit_details' 
  | 'branch_info' 
  | 'conflict_resolution'
  | 'stash_details'
  | 'tag_info'
  | 'remote_info'
  | 'merge_preview'
  | 'blame_view'
  | 'search_results';

// Action system
export interface Action {
  id: string;
  label: string;
  icon?: string;
  type: ActionType;
  enabled: boolean;
  loading?: boolean;
  confirmation?: string;
  shortcut?: string;
  payload?: any;
}

export type ActionType = 
  | 'git_add' | 'git_commit' | 'git_push' | 'git_pull' | 'git_fetch'
  | 'git_merge' | 'git_rebase' | 'git_checkout' | 'git_branch'
  | 'git_stash' | 'git_reset' | 'git_revert'
  | 'file_open' | 'file_edit' | 'file_delete'
  | 'panel_toggle' | 'view_change' | 'filter_apply'
  | 'bulk_operation' | 'custom';

// Layout management
export interface LayoutState {
  sidebar: SidebarState;
  main_view: MainViewState;
  details_panel: DetailsPanelState;
  header: HeaderState;
  theme: ThemeState;
  shortcuts: KeyboardShortcuts;
}

export interface SidebarState {
  width: number;
  is_collapsed: boolean;
  selected_organization?: string;
  selected_repositories: string[];
  search_query: string;
  expanded_organizations: string[];
  sort_by: RepositorySortBy;
  filter: RepositoryFilter;
}

export type RepositorySortBy = 'name' | 'last_accessed' | 'last_commit' | 'status';

export interface RepositoryFilter {
  status?: WorkingStatus[];
  sync_status?: SyncStatus[];
  organization?: string[];
  has_conflicts?: boolean;
  is_favorite?: boolean;
  is_dirty?: boolean;
}

export interface HeaderState {
  height: number;
  show_breadcrumb: boolean;
  global_search: string;
  notifications: Notification[];
  user_menu_open: boolean;
}

export interface ThemeState {
  mode: 'light' | 'dark' | 'auto';
  custom_colors?: Record<string, string>;
  font_size: number;
  font_family: string;
  compact_mode: boolean;
}

export interface KeyboardShortcuts {
  [key: string]: string; // shortcut -> action_id
}

// Notifications system
export interface NotificationSettings {
  pull_requests: boolean;
  merge_conflicts: boolean;
  sync_errors: boolean;
  build_status: boolean;
  mentions: boolean;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  is_read: boolean;
  repository_id?: string;
  action?: Action;
}

export type NotificationType = 
  | 'info' | 'success' | 'warning' | 'error' 
  | 'pull_request' | 'merge_conflict' | 'sync_error' | 'build_status';

// Bulk operations
export interface BulkOperation {
  id: string;
  type: BulkOperationType;
  repository_ids: string[];
  status: BulkOperationStatus;
  progress: number;
  results: BulkOperationResult[];
  started_at: number;
  completed_at?: number;
  error?: string;
}

export type BulkOperationType = 
  | 'pull' | 'push' | 'fetch' | 'checkout' 
  | 'merge' | 'stash' | 'clean' | 'sync';

export type BulkOperationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BulkOperationResult {
  repository_id: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  error?: string;
}

// Main application state
export interface AppState {
  // Core state
  workspaces: Record<string, Workspace>;
  active_workspace: string;
  layout: LayoutState;
  
  // Current context
  current_repository?: string;
  current_organization?: string;
  
  // Background operations
  bulk_operations: Record<string, BulkOperation>;
  background_tasks: BackgroundTask[];
  
  // Application state
  is_loading: boolean;
  last_sync: number;
  settings: AppSettings;
  cache: CacheState;
  
  // Error handling
  errors: AppError[];
  
  // Performance monitoring
  performance: PerformanceMetrics;
}

export interface BackgroundTask {
  id: string;
  type: 'sync' | 'fetch' | 'index' | 'backup';
  repository_id?: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  started_at: number;
}

export interface AppSettings {
  auto_sync_interval: number; // minutes
  max_recent_repos: number;
  enable_notifications: boolean;
  enable_background_sync: boolean;
  theme_sync_with_system: boolean;
  performance_monitoring: boolean;
  telemetry_enabled: boolean;
  language: string;
  startup_behavior: 'dashboard' | 'last_workspace' | 'last_repository';
}

export interface CacheState {
  repositories: Record<string, RepositoryCache>;
  commits: Record<string, CommitCache>;
  file_diffs: Record<string, FileDiffCache>;
  search_results: Record<string, SearchResultCache>;
  last_cleanup: number;
}

export interface RepositoryCache {
  branches: string[];
  tags: string[];
  remotes: Remote[];
  stashes: number;
  last_updated: number;
}

export interface CommitCache {
  commits: CommitInfo[];
  total_count: number;
  last_updated: number;
}

export interface CommitInfo {
  id: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  parents: string[];
  files_changed: number;
  insertions: number;
  deletions: number;
}

export interface FileDiffCache {
  content: string;
  last_updated: number;
  size: number;
}

export interface SearchResultCache {
  query: string;
  results: SearchResult[];
  last_updated: number;
}

export interface SearchResult {
  repository_id: string;
  file_path: string;
  line_number: number;
  content: string;
  match_start: number;
  match_end: number;
}

export interface AppError {
  id: string;
  type: 'git_error' | 'network_error' | 'filesystem_error' | 'application_error';
  message: string;
  details?: string;
  timestamp: number;
  repository_id?: string;
  stack_trace?: string;
  is_resolved: boolean;
}

export interface PerformanceMetrics {
  memory_usage: number;
  cpu_usage: number;
  git_operations: OperationMetric[];
  ui_render_times: number[];
  cache_hit_rate: number;
  last_measured: number;
}

export interface OperationMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
}