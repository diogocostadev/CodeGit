import React, { useMemo, useState } from 'react';
import { RepositoryInfo, DetailsPanelState, MainViewState, Action, DetailsPanelType } from '../../types/state';
import './DetailsPanel.css';

interface DetailsPanelProps {
  repository?: RepositoryInfo;
  layout: DetailsPanelState;
  mainViewState: MainViewState;
  onLayoutChange: (changes: Partial<DetailsPanelState>) => void;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({
  repository,
  layout,
  mainViewState,
  onLayoutChange
}) => {
  const [activeTab, setActiveTab] = useState<string>('details');

  // Determine what to show based on context
  const contextualContent = useMemo(() => {
    if (!repository) {
      return {
        type: 'empty' as DetailsPanelType,
        title: 'No Selection',
        data: null
      };
    }

    // Determine content based on main view mode and selected items
    switch (mainViewState.mode) {
      case 'history':
        if (mainViewState.selectedCommit) {
          return {
            type: 'commit_details' as DetailsPanelType,
            title: 'Commit Details',
            data: { commitId: mainViewState.selectedCommit }
          };
        }
        break;
      
      case 'changes':
        if (mainViewState.selectedFile) {
          return {
            type: 'file_diff' as DetailsPanelType,
            title: 'File Changes',
            data: { filePath: mainViewState.selectedFile }
          };
        }
        break;
      
      case 'branches':
        if (mainViewState.selectedBranch) {
          return {
            type: 'branch_info' as DetailsPanelType,
            title: 'Branch Information',
            data: { branchName: mainViewState.selectedBranch }
          };
        }
        break;
      
      case 'conflicts':
        return {
          type: 'conflict_resolution' as DetailsPanelType,
          title: 'Resolve Conflicts',
          data: { repository }
        };
      
      case 'merge':
        return {
          type: 'merge_preview' as DetailsPanelType,
          title: 'Merge Preview',
          data: { repository }
        };
      
      default:
        break;
    }

    // Default to repository overview
    return {
      type: 'repository_overview' as DetailsPanelType,
      title: 'Repository Overview',
      data: { repository }
    };
  }, [repository, mainViewState]);

  const availableTabs = useMemo(() => {
    const tabs = [
      { id: 'details', label: 'Details', icon: '📄' },
      { id: 'actions', label: 'Actions', icon: '⚡' }
    ];

    // Add context-specific tabs
    if (contextualContent.type === 'file_diff') {
      tabs.push({ id: 'history', label: 'History', icon: '🕒' });
    }
    
    if (contextualContent.type === 'commit_details') {
      tabs.push({ id: 'files', label: 'Files', icon: '📁' });
    }

    return tabs;
  }, [contextualContent.type]);

  const availableActions = useMemo(() => {
    if (!repository) return [];

    const actions: Action[] = [];

    // Context-specific actions
    switch (contextualContent.type) {
      case 'file_diff':
        actions.push(
          {
            id: 'stage-file',
            label: 'Stage File',
            icon: '✓',
            type: 'git_add',
            enabled: true
          },
          {
            id: 'discard-changes',
            label: 'Discard Changes',
            icon: '↺',
            type: 'git_reset',
            enabled: true,
            confirmation: 'Are you sure you want to discard all changes to this file?'
          }
        );
        break;
      
      case 'commit_details':
        actions.push(
          {
            id: 'cherry-pick',
            label: 'Cherry Pick',
            icon: '🍒',
            type: 'git_cherry_pick',
            enabled: true
          },
          {
            id: 'revert-commit',
            label: 'Revert',
            icon: '↩',
            type: 'git_revert',
            enabled: true,
            confirmation: 'Are you sure you want to revert this commit?'
          }
        );
        break;
      
      case 'branch_info':
        actions.push(
          {
            id: 'merge-branch',
            label: 'Merge',
            icon: '🔀',
            type: 'git_merge',
            enabled: true
          },
          {
            id: 'delete-branch',
            label: 'Delete Branch',
            icon: '🗑',
            type: 'git_branch',
            enabled: true,
            confirmation: 'Are you sure you want to delete this branch?'
          }
        );
        break;
    }

    // Global repository actions
    actions.push(
      {
        id: 'pull',
        label: 'Pull',
        icon: '⬇',
        type: 'git_pull',
        enabled: true,
        shortcut: 'Ctrl+P'
      },
      {
        id: 'push',
        label: 'Push',
        icon: '⬆',
        type: 'git_push',
        enabled: repository.ahead_count > 0,
        shortcut: 'Ctrl+Shift+P'
      },
      {
        id: 'fetch',
        label: 'Fetch',
        icon: '🔄',
        type: 'git_fetch',
        enabled: true,
        shortcut: 'Ctrl+F'
      }
    );

    return actions;
  }, [repository, contextualContent.type]);

  const handleActionClick = (action: Action) => {
    if (action.confirmation) {
      if (!window.confirm(action.confirmation)) return;
    }
    
    console.log('Executing action:', action.id, action.type);
    // Here we would emit the action to be handled by the parent
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return renderDetailsContent();
      case 'actions':
        return renderActionsContent();
      case 'history':
        return renderHistoryContent();
      case 'files':
        return renderFilesContent();
      default:
        return renderDetailsContent();
    }
  };

  const renderDetailsContent = () => {
    switch (contextualContent.type) {
      case 'empty':
        return <EmptyState />;
      case 'commit_details':
        return <CommitDetailsContent data={contextualContent.data} />;
      case 'file_diff':
        return <FileDiffContent data={contextualContent.data} />;
      case 'branch_info':
        return <BranchInfoContent data={contextualContent.data} />;
      case 'conflict_resolution':
        return <ConflictResolutionContent data={contextualContent.data} />;
      case 'merge_preview':
        return <MergePreviewContent data={contextualContent.data} />;
      case 'repository_overview':
        return <RepositoryOverviewContent data={contextualContent.data} />;
      default:
        return <EmptyState />;
    }
  };

  const renderActionsContent = () => (
    <div className="actions-content">
      <div className="actions-section">
        <h4>Quick Actions</h4>
        <div className="actions-grid">
          {availableActions.slice(0, 6).map(action => (
            <ActionButton
              key={action.id}
              action={action}
              onClick={handleActionClick}
            />
          ))}
        </div>
      </div>
      
      {availableActions.length > 6 && (
        <div className="actions-section">
          <h4>More Actions</h4>
          <div className="actions-list">
            {availableActions.slice(6).map(action => (
              <ActionListItem
                key={action.id}
                action={action}
                onClick={handleActionClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderHistoryContent = () => (
    <div className="history-content">
      <h4>File History</h4>
      <p>Recent commits affecting this file will be shown here.</p>
    </div>
  );

  const renderFilesContent = () => (
    <div className="files-content">
      <h4>Changed Files</h4>
      <p>Files modified in this commit will be shown here.</p>
    </div>
  );

  return (
    <div className="details-panel" style={{ width: layout.width }}>
      {/* Panel header */}
      <div className="details-panel-header">
        <div className="panel-title">
          <h3>{contextualContent.title}</h3>
        </div>
        
        <div className="panel-controls">
          <button
            className="panel-control-button"
            onClick={() => onLayoutChange({ is_collapsed: true })}
            title="Close panel"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      {availableTabs.length > 1 && (
        <div className="details-panel-tabs">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              className={`details-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="details-panel-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

// Content Components
const EmptyState: React.FC = () => (
  <div className="empty-state">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
    <p>Select an item to view details</p>
  </div>
);

const CommitDetailsContent: React.FC<{ data: any }> = ({ data }) => (
  <div className="commit-details">
    <div className="detail-item">
      <label>Commit ID:</label>
      <span className="commit-hash">{data.commitId}</span>
    </div>
    <div className="detail-item">
      <label>Message:</label>
      <span>feat: implement new feature</span>
    </div>
    <div className="detail-item">
      <label>Author:</label>
      <span>John Doe &lt;john@example.com&gt;</span>
    </div>
    <div className="detail-item">
      <label>Date:</label>
      <span>2024-01-15 14:30:00</span>
    </div>
    <div className="detail-item">
      <label>Files Changed:</label>
      <span>3 files (+25, -12)</span>
    </div>
  </div>
);

const FileDiffContent: React.FC<{ data: any }> = ({ data }) => (
  <div className="file-diff">
    <div className="detail-item">
      <label>File Path:</label>
      <span className="file-path">{data.filePath}</span>
    </div>
    <div className="detail-item">
      <label>Status:</label>
      <span className="file-status modified">Modified</span>
    </div>
    <div className="detail-item">
      <label>Changes:</label>
      <span>+15 -8 lines</span>
    </div>
    <div className="diff-preview">
      <div className="diff-line added">+ Added new functionality</div>
      <div className="diff-line removed">- Old implementation</div>
      <div className="diff-line context">  Context line</div>
    </div>
  </div>
);

const BranchInfoContent: React.FC<{ data: any }> = ({ data }) => (
  <div className="branch-info">
    <div className="detail-item">
      <label>Branch Name:</label>
      <span className="branch-name">{data.branchName}</span>
    </div>
    <div className="detail-item">
      <label>Tracking:</label>
      <span>origin/{data.branchName}</span>
    </div>
    <div className="detail-item">
      <label>Status:</label>
      <span>2 ahead, 0 behind</span>
    </div>
    <div className="detail-item">
      <label>Last Commit:</label>
      <span>feat: add new feature (2 hours ago)</span>
    </div>
  </div>
);

const ConflictResolutionContent: React.FC<{ data: any }> = ({ data }) => (
  <div className="conflict-resolution">
    <div className="conflict-status">
      <span className="conflict-icon">⚠️</span>
      <span>3 conflicts found</span>
    </div>
    <div className="conflict-files">
      <div className="conflict-file">
        <span className="file-icon">📄</span>
        <span>src/components/App.tsx</span>
        <span className="conflict-count">2 conflicts</span>
      </div>
      <div className="conflict-file">
        <span className="file-icon">📄</span>
        <span>package.json</span>
        <span className="conflict-count">1 conflict</span>
      </div>
    </div>
  </div>
);

const MergePreviewContent: React.FC<{ data: any }> = ({ data }) => (
  <div className="merge-preview">
    <div className="merge-summary">
      <h4>Merge Summary</h4>
      <div className="detail-item">
        <label>From:</label>
        <span>feature/new-ui</span>
      </div>
      <div className="detail-item">
        <label>Into:</label>
        <span>main</span>
      </div>
      <div className="detail-item">
        <label>Strategy:</label>
        <span>Fast-forward</span>
      </div>
    </div>
    <div className="merge-commits">
      <h4>Commits to Merge (3)</h4>
      <div className="commit-item">
        <span className="commit-hash">abc1234</span>
        <span className="commit-message">feat: add new UI components</span>
      </div>
    </div>
  </div>
);

const RepositoryOverviewContent: React.FC<{ data: any }> = ({ data }) => (
  <div className="repository-overview">
    <div className="repo-stats">
      <div className="stat-item">
        <span className="stat-value">{data.repository.branches?.length || 5}</span>
        <span className="stat-label">Branches</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{data.repository.commit_count || 127}</span>
        <span className="stat-label">Commits</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{data.repository.file_count || 45}</span>
        <span className="stat-label">Files</span>
      </div>
    </div>
    
    <div className="repo-info">
      <div className="detail-item">
        <label>Current Branch:</label>
        <span className="branch-name">{data.repository.current_branch}</span>
      </div>
      <div className="detail-item">
        <label>Remote:</label>
        <span>{data.repository.remote_origin || 'None'}</span>
      </div>
      <div className="detail-item">
        <label>Size:</label>
        <span>{formatBytes(data.repository.repo_size || 0)}</span>
      </div>
    </div>
  </div>
);

// Action Components
const ActionButton: React.FC<{
  action: Action;
  onClick: (action: Action) => void;
}> = ({ action, onClick }) => (
  <button
    className={`action-button ${!action.enabled ? 'disabled' : ''}`}
    onClick={() => onClick(action)}
    disabled={!action.enabled}
    title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
  >
    <span className="action-icon">{action.icon}</span>
    <span className="action-label">{action.label}</span>
  </button>
);

const ActionListItem: React.FC<{
  action: Action;
  onClick: (action: Action) => void;
}> = ({ action, onClick }) => (
  <div
    className={`action-list-item ${!action.enabled ? 'disabled' : ''}`}
    onClick={() => action.enabled && onClick(action)}
  >
    <span className="action-icon">{action.icon}</span>
    <span className="action-label">{action.label}</span>
    {action.shortcut && (
      <span className="action-shortcut">{action.shortcut}</span>
    )}
  </div>
);

// Utility functions
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default DetailsPanel;