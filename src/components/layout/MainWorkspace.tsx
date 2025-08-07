import React, { useMemo } from 'react';
import { RepositoryInfo, MainViewState, MainViewMode, Workspace } from '../../types/state';
import { useAppState } from '../../contexts/AppStateContext';
import './MainWorkspace.css';

// Import legacy components
import CommitHistory from '../../CommitHistory';
import DiffViewer from '../../DiffViewer';
import BranchManager from '../../BranchManager';
import MergeInteractive from '../../MergeInteractive';
import ConflictResolver from '../../ConflictResolver';

// Import new views
import RemotesView from '../views/RemotesView';

interface MainWorkspaceProps {
  repository?: RepositoryInfo;
  layout: MainViewState;
  onViewModeChange: (mode: MainViewMode) => void;
  onLayoutChange: (changes: Partial<MainViewState>) => void;
}

const MainWorkspace: React.FC<MainWorkspaceProps> = ({
  repository,
  layout,
  onViewModeChange,
  onLayoutChange
}) => {
  const availableModes: Array<{
    mode: MainViewMode;
    label: string;
    icon: React.ReactNode;
    description: string;
  }> = useMemo(() => [
    {
      mode: 'history',
      label: 'History',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684zM7.75 4a.75.75 0 01.75.75v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.75.75 0 017 8.25v-3.5A.75.75 0 017.75 4z"/>
        </svg>
      ),
      description: 'View commit history and timeline'
    },
    {
      mode: 'changes',
      label: 'Changes',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.75 14A1.75 1.75 0 01.15 11.25L.87 7.33a1.75 1.75 0 011.62-1.33h3.75l.42 2.88a.25.25 0 00.25.19h7.44a.25.25 0 00.25-.25V4.25a.25.25 0 00-.25-.25H2.5a.75.75 0 010-1.5h11.75c.966 0 1.75.784 1.75 1.75v4.75a1.75 1.75 0 01-1.75 1.75H9.06l-.44 2.88a.25.25 0 01-.25.19H2.75z"/>
        </svg>
      ),
      description: 'View and stage working directory changes'
    },
    {
      mode: 'branches',
      label: 'Branches',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9.5 3.25a2.25 2.25 0 11-3 0V4.5H5.5a2.5 2.5 0 00-2.5 2.5v1.25a2.25 2.25 0 100 1.5V7A1 1 0 014 6h2.5v6.75a2.25 2.25 0 101.5 0V6A1.5 1.5 0 019.5 4.5V3.25z"/>
        </svg>
      ),
      description: 'Manage branches and switches'
    },
    {
      mode: 'merge',
      label: 'Merge',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5.45 5.154A4.25 4.25 0 00.75 9.25a.75.75 0 101.5 0 2.75 2.75 0 013.162-2.72l.432.08a.75.75 0 00.274-1.474l-.432-.08A4.258 4.258 0 005.45 5.154zM9.75 2.25a.75.75 0 01.75.75v3.378c0 1.194.31 2.372.902 3.433l2.324 4.162a.25.25 0 01-.216.372H2.489a.25.25 0 01-.217-.372l2.324-4.162a7.76 7.76 0 00.902-3.433V3a.75.75 0 01.75-.75h3.002z"/>
        </svg>
      ),
      description: 'Handle merge and rebase operations'
    },
    {
      mode: 'conflicts',
      label: 'Conflicts',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.982 1.566a1.13 1.13 0 00-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.89 0 1.438-.99.982-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 01-1.1 0L7.1 5.995A.905.905 0 018 5zm.002 6a1 1 0 100 2 1 1 0 000-2z"/>
        </svg>
      ),
      description: 'Resolve merge conflicts'
    },
    {
      mode: 'remotes',
      label: 'Remotes',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z"/>
        </svg>
      ),
      description: 'Manage remote repositories'
    },
    {
      mode: 'timeline',
      label: 'Timeline',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.5 8a6.5 6.5 0 1113 0A6.5 6.5 0 011.5 8zM8 0a8 8 0 100 16A8 8 0 008 0zm.5 4.75a.75.75 0 00-1.5 0v3.5a.75.75 0 00.471.696l2.5 1a.75.75 0 00.557-1.392L8.5 7.742V4.75z"/>
        </svg>
      ),
      description: 'Cross-repository timeline view'
    }
  ], []);

  const renderModeContent = () => {
    if (!repository) {
      return (
        <div className="workspace-empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <h2>No Repository Selected</h2>
          <p>Select a repository from the sidebar to start working</p>
        </div>
      );
    }

    switch (layout.mode) {
      case 'history':
        return (
          <CommitHistory 
            repository={repository} 
            onNavigate={(screen: string) => {
              // Map legacy navigation to new mode system
              const modeMap: Record<string, MainViewMode> = {
                'dashboard': 'timeline',
                'diff': 'changes',
                'commits': 'history'
              };
              if (modeMap[screen]) {
                onViewModeChange(modeMap[screen]);
              }
            }}
          />
        );
      case 'changes':
        return (
          <DiffViewer 
            repository={repository} 
            commitHash={layout.selectedCommit}
            onNavigate={(screen: string) => {
              const modeMap: Record<string, MainViewMode> = {
                'commits': 'history',
                'diff': 'changes'
              };
              if (modeMap[screen]) {
                onViewModeChange(modeMap[screen]);
              }
            }}
          />
        );
      case 'branches':
        return (
          <BranchManager 
            repository={repository} 
            onNavigate={(screen: string) => {
              const modeMap: Record<string, MainViewMode> = {
                'dashboard': 'timeline',
                'merge': 'merge'
              };
              if (modeMap[screen]) {
                onViewModeChange(modeMap[screen]);
              }
            }}
          />
        );
      case 'merge':
        return (
          <MergeInteractive 
            repository={repository} 
            onNavigate={(screen: string) => {
              const modeMap: Record<string, MainViewMode> = {
                'commits': 'history',
                'conflicts': 'conflicts'
              };
              if (modeMap[screen]) {
                onViewModeChange(modeMap[screen]);
              }
            }}
          />
        );
      case 'conflicts':
        return (
          <ConflictResolver 
            repository={repository} 
            onNavigate={(screen: string) => {
              const modeMap: Record<string, MainViewMode> = {
                'commits': 'history',
                'merge': 'merge'
              };
              if (modeMap[screen]) {
                onViewModeChange(modeMap[screen]);
              }
            }}
          />
        );
      case 'remotes':
        return (
          <RemotesView 
            repository={repository} 
            layout={layout} 
            onLayoutChange={onLayoutChange} 
          />
        );
      case 'timeline':
        return <TimelineView repository={repository} layout={layout} onLayoutChange={onLayoutChange} />;
      default:
        return (
          <CommitHistory 
            repository={repository} 
            onNavigate={(screen: string) => {
              const modeMap: Record<string, MainViewMode> = {
                'dashboard': 'timeline',
                'diff': 'changes'
              };
              if (modeMap[screen]) {
                onViewModeChange(modeMap[screen]);
              }
            }}
          />
        );
    }
  };

  const getActiveModeBadge = () => {
    if (!repository) return null;
    
    const badges = [];
    if (repository.has_conflicts) {
      badges.push({ text: 'CONFLICTS', type: 'error' });
    }
    if (repository.is_dirty) {
      badges.push({ text: `${repository.modified_files} MODIFIED`, type: 'warning' });
    }
    if (repository.ahead_count > 0) {
      badges.push({ text: `${repository.ahead_count} AHEAD`, type: 'info' });
    }
    if (repository.behind_count > 0) {
      badges.push({ text: `${repository.behind_count} BEHIND`, type: 'warning' });
    }
    
    return badges.length > 0 ? badges : null;
  };

  const badges = getActiveModeBadge();

  return (
    <div className="main-workspace">
      {/* Mode navigation tabs */}
      <div className="workspace-header">
        <div className="mode-tabs">
          {availableModes.map(({ mode, label, icon }) => (
            <button
              key={mode}
              className={`mode-tab ${layout.mode === mode ? 'active' : ''}`}
              onClick={() => onViewModeChange(mode)}
              title={availableModes.find(m => m.mode === mode)?.description}
            >
              <span className="mode-icon">{icon}</span>
              <span className="mode-label">{label}</span>
            </button>
          ))}
        </div>

        {/* Status badges */}
        {badges && (
          <div className="status-badges">
            {badges.map((badge, index) => (
              <span key={index} className={`status-badge ${badge.type}`}>
                {badge.text}
              </span>
            ))}
          </div>
        )}

        {/* Quick actions */}
        {repository && (
          <div className="quick-actions">
            <button className="quick-action-button" title="Pull">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75z"/>
              </svg>
            </button>
            <button className="quick-action-button" title="Push">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.53 2.22a.75.75 0 00-1.06 0L3.72 5.97A.75.75 0 004.78 7.03l2.47-2.47v6.69a.75.75 0 001.5 0V4.56l2.47 2.47a.75.75 0 001.06-1.06L8.53 2.22z"/>
              </svg>
            </button>
            <button className="quick-action-button" title="Fetch">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2.5a5.487 5.487 0 00-4.131 1.869l1.204 1.204A.25.25 0 004.896 6H1.25A.25.25 0 011 5.75V2.104a.25.25 0 01.427-.177L2.61 3.109A7.002 7.002 0 0115.95 7.5a.75.75 0 01-1.5.072A5.5 5.5 0 008 2.5z"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="workspace-content">
        {renderModeContent()}
      </div>
    </div>
  );
};

// RemotesView is now implemented in ../views/RemotesView.tsx

const TimelineView: React.FC<{
  repository: RepositoryInfo;
  layout: MainViewState;
  onLayoutChange: (changes: Partial<MainViewState>) => void;
}> = ({ repository, layout, onLayoutChange }) => {
  const { state } = useAppState();
  const currentWorkspace = state.workspaces[state.active_workspace];
  
  const [timelineFilter, setTimelineFilter] = React.useState({
    author: '',
    organization: '',
    timeRange: '7d' as '1d' | '7d' | '30d' | '90d' | 'all',
    repositories: [] as string[]
  });

  // Get all repositories in current workspace
  const allRepositories = useMemo(() => {
    if (!currentWorkspace) return [];
    return Object.values(currentWorkspace.repositories);
  }, [currentWorkspace]);

  // Mock timeline data - in real implementation, this would come from the backend
  const timelineEntries = useMemo(() => {
    const entries = [];
    const now = Date.now();
    const timeRangeMs = timelineFilter.timeRange === '1d' ? 86400000 :
                        timelineFilter.timeRange === '7d' ? 604800000 :
                        timelineFilter.timeRange === '30d' ? 2592000000 :
                        timelineFilter.timeRange === '90d' ? 7776000000 : 0;
    
    const startTime = timeRangeMs > 0 ? now - timeRangeMs : 0;
    
    // Generate mock data for each repository
    allRepositories.forEach((repo, repoIndex) => {
      const orgColor = currentWorkspace.organizations
        .find(org => org.id === repo.organization_id)?.color || '#3b82f6';
      
      // Generate 3-10 mock commits per repo within time range
      const commitCount = Math.floor(Math.random() * 8) + 3;
      for (let i = 0; i < commitCount; i++) {
        const commitTime = startTime + Math.random() * (now - startTime);
        entries.push({
          id: `${repo.id}-commit-${i}`,
          type: 'commit' as const,
          timestamp: commitTime,
          repository: repo,
          author: ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown'][Math.floor(Math.random() * 4)],
          message: [
            'feat: add new authentication system',
            'fix: resolve memory leak in worker thread',
            'docs: update API documentation',
            'refactor: simplify data processing logic',
            'test: add unit tests for user validation',
            'style: update component styling',
            'chore: update dependencies'
          ][Math.floor(Math.random() * 7)],
          branch: repo.current_branch,
          hash: Math.random().toString(36).substring(2, 8),
          organizationColor: orgColor
        });
      }
    });
    
    // Sort by timestamp descending
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }, [allRepositories, currentWorkspace, timelineFilter.timeRange]);

  const filteredEntries = useMemo(() => {
    return timelineEntries.filter(entry => {
      if (timelineFilter.author && !entry.author.toLowerCase().includes(timelineFilter.author.toLowerCase())) {
        return false;
      }
      if (timelineFilter.organization && entry.repository.organization_id !== timelineFilter.organization) {
        return false;
      }
      if (timelineFilter.repositories.length > 0 && !timelineFilter.repositories.includes(entry.repository.id)) {
        return false;
      }
      return true;
    });
  }, [timelineEntries, timelineFilter]);

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getActivityStats = () => {
    const stats = {
      totalCommits: filteredEntries.length,
      activeRepos: new Set(filteredEntries.map(e => e.repository.id)).size,
      topAuthor: '',
      topAuthorCount: 0
    };
    
    const authorCounts = new Map<string, number>();
    filteredEntries.forEach(entry => {
      const count = authorCounts.get(entry.author) || 0;
      authorCounts.set(entry.author, count + 1);
      if (count + 1 > stats.topAuthorCount) {
        stats.topAuthor = entry.author;
        stats.topAuthorCount = count + 1;
      }
    });
    
    return stats;
  };

  const stats = getActivityStats();

  return (
    <div className="timeline-view">
      <div className="timeline-header">
        <h2>Cross-Repository Timeline</h2>
        <div className="timeline-stats">
          <div className="stat-item">
            <span className="stat-number">{stats.totalCommits}</span>
            <span className="stat-label">Commits</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.activeRepos}</span>
            <span className="stat-label">Active Repos</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.topAuthor}</span>
            <span className="stat-label">Top Contributor</span>
          </div>
        </div>
      </div>

      <div className="timeline-filters">
        <div className="filter-group">
          <label>Time Range:</label>
          <select
            value={timelineFilter.timeRange}
            onChange={(e) => setTimelineFilter(prev => ({ 
              ...prev, 
              timeRange: e.target.value as typeof prev.timeRange 
            }))}
            className="filter-select"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Author:</label>
          <input
            type="text"
            placeholder="Filter by author..."
            value={timelineFilter.author}
            onChange={(e) => setTimelineFilter(prev => ({ ...prev, author: e.target.value }))}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Organization:</label>
          <select
            value={timelineFilter.organization}
            onChange={(e) => setTimelineFilter(prev => ({ ...prev, organization: e.target.value }))}
            className="filter-select"
          >
            <option value="">All Organizations</option>
            {currentWorkspace?.organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="timeline-content">
        {filteredEntries.length === 0 ? (
          <div className="timeline-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <p>No activity found</p>
            <p className="empty-subtitle">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="timeline-entries">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="timeline-entry">
                <div className="timeline-marker">
                  <div 
                    className="timeline-dot"
                    style={{ backgroundColor: entry.organizationColor }}
                  />
                  <div className="timeline-line" />
                </div>
                
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <div className="timeline-repo-info">
                      <span 
                        className="repo-indicator"
                        style={{ backgroundColor: entry.organizationColor }}
                      />
                      <span className="repo-name">{entry.repository.name}</span>
                      <span className="repo-branch">{entry.branch}</span>
                    </div>
                    <span className="timeline-time">{formatRelativeTime(entry.timestamp)}</span>
                  </div>
                  
                  <div className="timeline-card-content">
                    <div className="commit-info">
                      <span className="commit-hash">#{entry.hash}</span>
                      <span className="commit-message">{entry.message}</span>
                    </div>
                    <div className="commit-author">by {entry.author}</div>
                  </div>
                  
                  <div className="timeline-card-actions">
                    <button 
                      className="timeline-action"
                      onClick={() => onLayoutChange({ selectedRepo: entry.repository.id, mode: 'history' })}
                    >
                      View Details
                    </button>
                    <button className="timeline-action">
                      View Diff
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MainWorkspace;