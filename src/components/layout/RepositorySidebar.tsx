import React, { useState, useMemo, useCallback } from 'react';
import { Workspace, SidebarState, Organization, RepositoryInfo, RepositorySortBy } from '../../types/state';
import BulkOperationsPanel from '../bulk/BulkOperationsPanel';
import RepositoryDiscoveryPanel from '../repository/RepositoryDiscoveryPanel';
import { useAppState } from '../../contexts/AppStateContext';
import './RepositorySidebar.css';

interface RepositorySidebarProps {
  workspace: Workspace;
  layout: SidebarState;
  selectedRepository?: string;
  onRepositorySelect: (repositoryId: string) => void;
  onLayoutChange: (changes: Partial<SidebarState>) => void;
}

const RepositorySidebar: React.FC<RepositorySidebarProps> = ({
  workspace,
  layout,
  selectedRepository,
  onRepositorySelect,
  onLayoutChange
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    repository?: RepositoryInfo;
    organization?: Organization;
  } | null>(null);

  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [showOrganizationManager, setShowOrganizationManager] = useState(false);
  const [showRepositoryDiscovery, setShowRepositoryDiscovery] = useState(false);

  // Filter and sort repositories
  const filteredRepositories = useMemo(() => {
    if (!workspace) return [];

    const repos = Object.values(workspace.repositories);
    let filtered = repos;

    // Apply search filter
    if (layout.search_query) {
      const query = layout.search_query.toLowerCase();
      filtered = filtered.filter(repo =>
        repo.name.toLowerCase().includes(query) ||
        repo.path.toLowerCase().includes(query) ||
        repo.current_branch.toLowerCase().includes(query)
      );
    }

    // Apply status filters
    if (layout.filter.status && layout.filter.status.length > 0) {
      filtered = filtered.filter(repo => layout.filter.status!.includes(repo.working_status));
    }

    if (layout.filter.sync_status && layout.filter.sync_status.length > 0) {
      filtered = filtered.filter(repo => layout.filter.sync_status!.includes(repo.sync_status));
    }

    if (layout.filter.has_conflicts !== undefined) {
      filtered = filtered.filter(repo => repo.has_conflicts === layout.filter.has_conflicts);
    }

    if (layout.filter.is_favorite !== undefined) {
      filtered = filtered.filter(repo => repo.is_favorite === layout.filter.is_favorite);
    }

    if (layout.filter.is_dirty !== undefined) {
      filtered = filtered.filter(repo => repo.is_dirty === layout.filter.is_dirty);
    }

    // Sort repositories
    filtered.sort((a, b) => {
      switch (layout.sort_by) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'last_accessed':
          return b.last_accessed - a.last_accessed;
        case 'last_commit':
          return new Date(b.last_commit).getTime() - new Date(a.last_commit).getTime();
        case 'status':
          const statusOrder = ['conflicted', 'modified', 'staged', 'clean'];
          return statusOrder.indexOf(a.working_status) - statusOrder.indexOf(b.working_status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [workspace, layout.search_query, layout.filter, layout.sort_by]);

  // Group repositories by organization
  const groupedRepositories = useMemo(() => {
    if (!workspace) return { organizations: [], ungrouped: [] };

    const organizations = workspace.organizations.map(org => ({
      ...org,
      repositories: filteredRepositories.filter(repo => repo.organization_id === org.id)
    })).filter(org => org.repositories.length > 0);

    const ungrouped = filteredRepositories.filter(repo => !repo.organization_id);

    return { organizations, ungrouped };
  }, [workspace, filteredRepositories]);

  const handleSearchChange = useCallback((query: string) => {
    onLayoutChange({ search_query: query });
  }, [onLayoutChange]);

  const handleSortChange = useCallback((sortBy: RepositorySortBy) => {
    onLayoutChange({ sort_by: sortBy });
  }, [onLayoutChange]);

  const handleRepositoryContextMenu = useCallback((e: React.MouseEvent, repository: RepositoryInfo) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      repository
    });
  }, []);

  const handleOrganizationToggle = useCallback((orgId: string) => {
    const expandedOrgs = layout.expanded_organizations || [];
    const expanded = expandedOrgs.includes(orgId);
    const newExpanded = expanded
      ? expandedOrgs.filter(id => id !== orgId)
      : [...expandedOrgs, orgId];
    
    onLayoutChange({ expanded_organizations: newExpanded });
  }, [layout.expanded_organizations, onLayoutChange]);

  const handleRepositorySelection = useCallback((repoId: string, multiSelect: boolean = false) => {
    if (multiSelect) {
      const selectedRepos = layout.selected_repositories || [];
      const isSelected = selectedRepos.includes(repoId);
      const newSelected = isSelected
        ? selectedRepos.filter(id => id !== repoId)
        : [...selectedRepos, repoId];
      
      onLayoutChange({ selected_repositories: newSelected });
    } else {
      onRepositorySelect(repoId);
      onLayoutChange({ selected_repositories: [repoId] });
    }
  }, [layout.selected_repositories, onRepositorySelect, onLayoutChange]);

  const getRepositoryStatusIcon = (repo: RepositoryInfo) => {
    if (repo.has_conflicts) {
      return <StatusIcon type="conflict" />;
    }
    if (repo.sync_status === 'syncing') {
      return <StatusIcon type="syncing" />;
    }
    if (repo.sync_status === 'ahead') {
      return <StatusIcon type="ahead" count={repo.ahead_count} />;
    }
    if (repo.sync_status === 'behind') {
      return <StatusIcon type="behind" count={repo.behind_count} />;
    }
    if (repo.sync_status === 'diverged') {
      return <StatusIcon type="diverged" />;
    }
    if (repo.working_status === 'modified' || repo.is_dirty) {
      return <StatusIcon type="modified" count={repo.modified_files} />;
    }
    if (repo.working_status === 'staged') {
      return <StatusIcon type="staged" count={repo.staged_files} />;
    }
    if (repo.working_status === 'clean' && repo.sync_status === 'up_to_date') {
      return <StatusIcon type="clean" />;
    }
    return null;
  };

  return (
    <div className="repository-sidebar" style={{ width: layout.width }}>
      {/* Search and controls */}
      <div className="sidebar-header">
        <div className="search-section">
          <div className="search-input-wrapper">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search repositories..."
              value={layout.search_query}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {layout.search_query && (
              <button
                className="search-clear"
                onClick={() => handleSearchChange('')}
                aria-label="Clear search"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 4.586L9.707.879A1 1 0 0111.121 2.293L7.414 6l3.707 3.707a1 1 0 01-1.414 1.414L6 7.414l-3.707 3.707A1 1 0 01.879 9.707L4.586 6 .879 2.293A1 1 0 012.293.879L6 4.586z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="controls-section">
          <select 
            className="sort-select"
            value={layout.sort_by}
            onChange={(e) => handleSortChange(e.target.value as RepositorySortBy)}
          >
            <option value="name">Name</option>
            <option value="last_accessed">Last Accessed</option>
            <option value="last_commit">Last Commit</option>
            <option value="status">Status</option>
          </select>
          
          <button className="filter-button" title="Filter repositories">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 2.75a.75.75 0 00-1.5 0v8.5a.75.75 0 001.5 0v-3.5h4a.75.75 0 000-1.5h-4v-3.5zM14 7a.75.75 0 01-.75.75h-4a.75.75 0 010-1.5h4A.75.75 0 0114 7zM14 11.25a.75.75 0 01-.75.75h-4a.75.75 0 010-1.5h4a.75.75 0 01.75.75z"/>
            </svg>
          </button>
          
          <button 
            className="organization-button" 
            title="Manage organizations"
            onClick={() => setShowOrganizationManager(true)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0114.25 14H1.75A1.75 1.75 0 010 12.25v-8.5C0 2.784.784 2 1.75 2zM1.5 12.251c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V9.5h-13v2.751zm13-8.501a.25.25 0 00-.25-.25H1.75a.25.25 0 00-.25.25V8h13V3.75z"/>
              <path d="M9.5 5.5a.5.5 0 01.5-.5h4a.5.5 0 010 1h-4a.5.5 0 01-.5-.5zM2.5 5.5a.5.5 0 01.5-.5h4a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"/>
            </svg>
          </button>

          <button 
            className="discovery-button" 
            title="Discover repositories"
            onClick={() => setShowRepositoryDiscovery(true)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.22 8.72a.75.75 0 001.06 0l5.22-5.22V6.25a.75.75 0 001.5 0V3.5a.75.75 0 00-.75-.75h-2.75a.75.75 0 000 1.5h2.69L7.28 9.15a.75.75 0 000 1.06z"/>
              <path d="M3.25 3.25h3a.75.75 0 000-1.5h-3A1.75 1.75 0 001.5 3.5v9c0 .966.784 1.75 1.75 1.75h9A1.75 1.75 0 0014 12.5v-3a.75.75 0 00-1.5 0v3a.25.25 0 01-.25.25h-9a.25.25 0 01-.25-.25v-9a.25.25 0 01.25-.25z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Repository list */}
      <div className="sidebar-content">
        {/* Organizations */}
        {workspace?.organizations?.length > 0 ? (
          groupedRepositories.organizations.map(org => (
            <OrganizationSection
              key={org.id}
              organization={org}
              repositories={org.repositories}
              isExpanded={(layout.expanded_organizations || []).includes(org.id)}
              selectedRepository={selectedRepository}
              selectedRepositories={layout.selected_repositories || []}
              onToggle={() => handleOrganizationToggle(org.id)}
              onRepositorySelect={handleRepositorySelection}
              onRepositoryContextMenu={handleRepositoryContextMenu}
              getRepositoryStatusIcon={getRepositoryStatusIcon}
            />
          ))
        ) : (
          <div className="organizations-empty">
            <div className="empty-organizations-header">
              <span>Organizations</span>
              <button 
                className="create-org-button" 
                onClick={() => setShowOrganizationManager(true)}
                title="Create new organization"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
                </svg>
              </button>
            </div>
            <p className="empty-organizations-hint">Create organizations to group your repositories</p>
          </div>
        )}

        {/* Ungrouped repositories */}
        {groupedRepositories.ungrouped.length > 0 && (
          <div className="ungrouped-section">
            {groupedRepositories.organizations.length > 0 && (
              <div className="section-divider">
                <span>Other Repositories</span>
              </div>
            )}
            {groupedRepositories.ungrouped.map(repo => (
              <RepositoryItem
                key={repo.id}
                repository={repo}
                isSelected={selectedRepository === repo.id}
                isMultiSelected={(layout.selected_repositories || []).includes(repo.id)}
                statusIcon={getRepositoryStatusIcon(repo)}
                onSelect={(multiSelect) => handleRepositorySelection(repo.id, multiSelect)}
                onContextMenu={(e) => handleRepositoryContextMenu(e, repo)}
              />
            ))}
          </div>
        )}

        {filteredRepositories.length === 0 && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p>No repositories found</p>
            <p className="empty-hint">Get started by discovering Git repositories on your system</p>
            <button 
              className="add-repository-button"
              onClick={() => setShowRepositoryDiscovery(true)}
            >
              🔍 Discover Repositories
            </button>
          </div>
        )}
      </div>

      {/* Bulk actions toolbar (shows when multiple repos are selected) */}
      {(layout.selected_repositories || []).length > 1 && (
        <div className="bulk-actions-toolbar">
          <span className="selected-count">
            {(layout.selected_repositories || []).length} selected
          </span>
          <div className="bulk-actions">
            <button 
              className="bulk-action-button" 
              title="Pull all"
              onClick={() => setShowBulkOperations(true)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z"/>
              </svg>
            </button>
            <button 
              className="bulk-action-button" 
              title="Push all"
              onClick={() => setShowBulkOperations(true)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.53 2.22a.75.75 0 00-1.06 0L3.72 5.97A.75.75 0 004.78 7.03l2.47-2.47v6.69a.75.75 0 001.5 0V4.56l2.47 2.47a.75.75 0 001.06-1.06L8.53 2.22z"/>
              </svg>
            </button>
            <button 
              className="bulk-action-button" 
              title="Fetch all"
              onClick={() => setShowBulkOperations(true)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2.5a5.487 5.487 0 00-4.131 1.869l1.204 1.204A.25.25 0 014.896 6H1.25A.25.25 0 011 5.75V2.104a.25.25 0 01.427-.177L2.61 3.109A7.002 7.002 0 0115.95 7.5a.75.75 0 01-1.5.072A5.5 5.5 0 008 2.5z"/>
                <path d="M.05 8.5a.75.75 0 01.5-.072A5.5 5.5 0 008 13.5a5.487 5.487 0 004.131-1.869l-1.204-1.204a.25.25 0 01.177-.427h3.646a.25.25 0 01.25.25v3.646a.25.25 0 01-.427.177l-1.183-1.183A7.002 7.002 0 01.05 8.5z"/>
              </svg>
            </button>
            <button 
              className="bulk-action-button more-actions" 
              title="More bulk actions"
              onClick={() => setShowBulkOperations(true)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM1.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm13 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <RepositoryContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          repository={contextMenu.repository}
          organization={contextMenu.organization}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Bulk Operations Panel Modal */}
      {showBulkOperations && (layout.selected_repositories || []).length > 1 && (
        <div className="bulk-operations-modal">
          <div className="bulk-operations-backdrop" onClick={() => setShowBulkOperations(false)} />
          <div className="bulk-operations-container">
            <BulkOperationsPanel
              repositories={Object.values(workspace?.repositories || {})}
              selectedRepositories={new Set(layout.selected_repositories || [])}
              onClose={() => setShowBulkOperations(false)}
            />
          </div>
        </div>
      )}

      {/* Organization Manager Modal */}
      {showOrganizationManager && (
        <div className="organization-manager-modal">
          <div className="organization-manager-backdrop" onClick={() => setShowOrganizationManager(false)} />
          <div className="organization-manager-container">
            <OrganizationManager
              workspace={workspace}
              onClose={() => setShowOrganizationManager(false)}
            />
          </div>
        </div>
      )}

      {/* Repository Discovery Modal */}
      {showRepositoryDiscovery && (
        <div className="repository-discovery-modal">
          <div className="repository-discovery-backdrop" onClick={() => setShowRepositoryDiscovery(false)} />
          <div className="repository-discovery-container">
            <RepositoryDiscoveryPanel
              onClose={() => setShowRepositoryDiscovery(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Organization section component
const OrganizationSection: React.FC<{
  organization: Organization & { repositories: RepositoryInfo[] };
  repositories: RepositoryInfo[];
  isExpanded: boolean;
  selectedRepository?: string;
  selectedRepositories: string[];
  onToggle: () => void;
  onRepositorySelect: (repoId: string, multiSelect?: boolean) => void;
  onRepositoryContextMenu: (e: React.MouseEvent, repo: RepositoryInfo) => void;
  getRepositoryStatusIcon: (repo: RepositoryInfo) => React.ReactNode;
}> = ({
  organization,
  repositories,
  isExpanded,
  selectedRepository,
  selectedRepositories,
  onToggle,
  onRepositorySelect,
  onRepositoryContextMenu,
  getRepositoryStatusIcon
}) => {
  const hasChanges = repositories.some(repo => repo.is_dirty || repo.has_conflicts || repo.sync_status !== 'up_to_date');

  return (
    <div className="organization-section">
      <div 
        className={`organization-header ${hasChanges ? 'has-changes' : ''}`}
        onClick={onToggle}
      >
        <div className="organization-toggle">
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="currentColor"
            className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}
          >
            <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 01-.53 1.28H4.75a.75.75 0 01-.53-1.28L6.22 3.22z"/>
          </svg>
        </div>
        <div 
          className="organization-color" 
          style={{ backgroundColor: organization.color }}
        />
        <span className="organization-name">{organization.name}</span>
        <span className="repository-count">
          {repositories.length}
        </span>
        {hasChanges && <div className="changes-indicator" />}
      </div>
      
      {isExpanded && (
        <div className="organization-repositories">
          {repositories.map(repo => (
            <RepositoryItem
              key={repo.id}
              repository={repo}
              isSelected={selectedRepository === repo.id}
              isMultiSelected={selectedRepositories.includes(repo.id)}
              statusIcon={getRepositoryStatusIcon(repo)}
              onSelect={(multiSelect) => onRepositorySelect(repo.id, multiSelect)}
              onContextMenu={(e) => onRepositoryContextMenu(e, repo)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Repository item component
const RepositoryItem: React.FC<{
  repository: RepositoryInfo;
  isSelected: boolean;
  isMultiSelected: boolean;
  statusIcon: React.ReactNode;
  onSelect: (multiSelect: boolean) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}> = ({ repository, isSelected, isMultiSelected, statusIcon, onSelect, onContextMenu }) => {
  return (
    <div
      className={`repository-item ${isSelected ? 'selected' : ''} ${isMultiSelected ? 'multi-selected' : ''}`}
      onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
      onContextMenu={onContextMenu}
    >
      <div className="repository-main">
        <div className="repository-icon">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
          </svg>
        </div>
        <div className="repository-info">
          <div className="repository-name">{repository.name}</div>
          <div className="repository-branch">{repository.current_branch}</div>
        </div>
        <div className="repository-status">
          {repository.is_favorite && (
            <svg className="favorite-icon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.314C7.313.675 6.343.17 5.25.17c-1.993 0-3.25 1.268-3.25 2.743 0 .493.071.967.208 1.418l.063.211C2.598 5.677 3.678 7.051 8 10.986c4.322-3.935 5.402-5.309 5.729-6.444l.063-.211c.137-.451.208-.925.208-1.418C14 1.438 12.743.17 10.75.17c-1.093 0-2.063.505-2.75 1.144z"/>
            </svg>
          )}
          {statusIcon}
        </div>
      </div>
    </div>
  );
};

// Status icon component
const StatusIcon: React.FC<{
  type: 'conflict' | 'syncing' | 'ahead' | 'behind' | 'diverged' | 'modified' | 'staged' | 'clean';
  count?: number;
}> = ({ type, count }) => {
  switch (type) {
    case 'conflict':
      return (
        <div className="status-icon conflict" title="Has conflicts">
          ⚠️
        </div>
      );
    case 'syncing':
      return (
        <div className="status-icon syncing rotating" title="Syncing">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 104.546 2.914.5.5 0 00-.908-.417A4 4 0 118 4v1l1.5-1.5L8 2v1z"/>
          </svg>
        </div>
      );
    case 'ahead':
      return (
        <div className="status-icon ahead" title={`${count} commits ahead`}>
          ↑{count}
        </div>
      );
    case 'behind':
      return (
        <div className="status-icon behind" title={`${count} commits behind`}>
          ↓{count}
        </div>
      );
    case 'diverged':
      return (
        <div className="status-icon diverged" title="Diverged from remote">
          ↕
        </div>
      );
    case 'modified':
      return (
        <div className="status-icon modified" title={`${count} modified files`}>
          ●
        </div>
      );
    case 'staged':
      return (
        <div className="status-icon staged" title={`${count} staged files`}>
          ✓
        </div>
      );
    case 'clean':
      return (
        <div className="status-icon clean" title="Up to date">
          ✓
        </div>
      );
    default:
      return null;
  }
};

// Context menu component
const RepositoryContextMenu: React.FC<{
  x: number;
  y: number;
  repository?: RepositoryInfo;
  organization?: Organization;
  onClose: () => void;
}> = ({ x, y, repository, organization, onClose }) => {
  React.useEffect(() => {
    const handleClickOutside = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div className="context-menu" style={{ left: x, top: y }}>
      {repository && (
        <>
          <div className="context-menu-item">
            <span>Open in File Manager</span>
          </div>
          <div className="context-menu-item">
            <span>Open Terminal</span>
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item">
            <span>Pull</span>
          </div>
          <div className="context-menu-item">
            <span>Push</span>
          </div>
          <div className="context-menu-item">
            <span>Fetch</span>
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item">
            <span>{repository.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
          </div>
          <div className="context-menu-item danger">
            <span>Remove Repository</span>
          </div>
        </>
      )}
    </div>
  );
};

// Organization Manager component
const OrganizationManager: React.FC<{
  workspace: Workspace;
  onClose: () => void;
}> = ({ workspace, onClose }) => {
  const { addOrganization, updateOrganization, removeOrganization, updateRepository } = useAppState();
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgColor, setNewOrgColor] = useState('#3b82f6');
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  const predefinedColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
    '#ec4899', '#6366f1', '#14b8a6', '#eab308'
  ];

  const handleCreateOrganization = () => {
    if (!newOrgName.trim()) return;

    const newOrg: Organization = {
      id: Date.now().toString(),
      name: newOrgName.trim(),
      color: newOrgColor,
      repositories: [],
      settings: {
        auto_fetch_interval: 5,
        auto_group_by_domain: true,
        default_branch_protection: false,
        notification_preferences: {
          pull_requests: true,
          merge_conflicts: true,
          sync_errors: true,
          build_status: false,
          mentions: true
        }
      },
      created_at: Date.now(),
      updated_at: Date.now()
    };

    addOrganization(newOrg);
    setNewOrgName('');
    setNewOrgColor('#3b82f6');
  };

  const handleUpdateOrganization = (org: Organization) => {
    updateOrganization({ ...org, updated_at: Date.now() });
    setEditingOrg(null);
  };

  const handleDeleteOrganization = (orgId: string) => {
    // Move all repositories from this organization to ungrouped
    Object.values(workspace.repositories).forEach(repo => {
      if (repo.organization_id === orgId) {
        updateRepository({ ...repo, organization_id: undefined });
      }
    });
    
    removeOrganization(orgId);
  };

  const handleMoveRepository = (repoId: string, targetOrgId: string | undefined) => {
    const repo = workspace.repositories[repoId];
    if (repo) {
      updateRepository({ ...repo, organization_id: targetOrgId });
    }
  };

  const ungroupedRepos = Object.values(workspace.repositories).filter(repo => !repo.organization_id);

  return (
    <div className="organization-manager">
      <div className="manager-header">
        <h3>Manage Organizations</h3>
        <button className="close-button" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
          </svg>
        </button>
      </div>

      <div className="manager-content">
        {/* Create New Organization */}
        <div className="create-organization-section">
          <h4>Create New Organization</h4>
          <div className="create-form">
            <div className="form-row">
              <input
                type="text"
                placeholder="Organization name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateOrganization()}
                className="org-name-input"
              />
              <div className="color-picker">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    className={`color-option ${newOrgColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewOrgColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <button 
              className="create-button"
              onClick={handleCreateOrganization}
              disabled={!newOrgName.trim()}
            >
              Create Organization
            </button>
          </div>
        </div>

        {/* Existing Organizations */}
        <div className="organizations-list">
          <h4>Organizations ({workspace.organizations.length})</h4>
          {workspace.organizations.map(org => {
            const orgRepos = Object.values(workspace.repositories).filter(
              repo => repo.organization_id === org.id
            );

            return (
              <div key={org.id} className="organization-item">
                <div className="org-header">
                  <div className="org-info">
                    <div 
                      className="org-color-indicator" 
                      style={{ backgroundColor: org.color }}
                    />
                    {editingOrg?.id === org.id ? (
                      <input
                        type="text"
                        value={editingOrg.name}
                        onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateOrganization(editingOrg);
                          if (e.key === 'Escape') setEditingOrg(null);
                        }}
                        onBlur={() => handleUpdateOrganization(editingOrg)}
                        className="org-name-edit"
                        autoFocus
                      />
                    ) : (
                      <span 
                        className="org-name"
                        onDoubleClick={() => setEditingOrg(org)}
                      >
                        {org.name}
                      </span>
                    )}
                    <span className="org-repo-count">({orgRepos.length} repos)</span>
                  </div>
                  <div className="org-actions">
                    <button 
                      className="edit-button"
                      onClick={() => setEditingOrg(org)}
                      title="Edit organization"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61z"/>
                      </svg>
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteOrganization(org.id)}
                      title="Delete organization"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 00-1.492-.149L10.844 13.5a.25.25 0 01-.249.219H5.405a.25.25 0 01-.249-.219L4.496 6.675z"/>
                      </svg>
                    </button>
                  </div>
                </div>
                
                {orgRepos.length > 0 && (
                  <div className="org-repositories">
                    {orgRepos.slice(0, 3).map(repo => (
                      <div key={repo.id} className="org-repo-item">
                        <span className="repo-name">{repo.name}</span>
                        <button 
                          className="ungroup-button"
                          onClick={() => handleMoveRepository(repo.id, undefined)}
                          title="Remove from organization"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {orgRepos.length > 3 && (
                      <span className="more-repos">+{orgRepos.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Ungrouped Repositories */}
        {ungroupedRepos.length > 0 && (
          <div className="ungrouped-section">
            <h4>Ungrouped Repositories ({ungroupedRepos.length})</h4>
            <div className="ungrouped-repos">
              {ungroupedRepos.map(repo => (
                <div key={repo.id} className="ungrouped-repo-item">
                  <span className="repo-name">{repo.name}</span>
                  <select
                    value=""
                    onChange={(e) => e.target.value && handleMoveRepository(repo.id, e.target.value)}
                    className="move-to-org-select"
                  >
                    <option value="">Move to organization...</option>
                    {workspace.organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {workspace.organizations.length === 0 && ungroupedRepos.length === 0 && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <p>No organizations or repositories yet</p>
            <p className="empty-hint">Create an organization to better organize your repositories</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepositorySidebar;