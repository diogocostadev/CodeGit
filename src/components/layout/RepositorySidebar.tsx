import React, { useState, useMemo, useCallback } from 'react';
import { Workspace, SidebarState, Organization, RepositoryInfo, RepositorySortBy } from '../../types/state';
import BulkOperationsPanel from '../bulk/BulkOperationsPanel';
import RepositoryDiscoveryPanel from '../repository/RepositoryDiscoveryPanel';
import { useAppState } from '../../contexts/AppStateContext';
import { invoke } from '@tauri-apps/api/tauri';
import './RepositorySidebar.css';

interface RepositorySidebarProps {
  workspace: Workspace;
  layout: SidebarState;
  selectedRepository?: string;
  onRepositorySelect: (repositoryId: string) => void;
  onLayoutChange: (changes: Partial<SidebarState>) => void;
  showFilter?: boolean;
  showOrganizations?: boolean;
  showDiscovery?: boolean;
  onCloseFilter?: () => void;
  onCloseOrganizations?: () => void;
  onCloseDiscovery?: () => void;
}

const RepositorySidebar: React.FC<RepositorySidebarProps> = ({
  workspace,
  layout,
  selectedRepository,
  onRepositorySelect,
  onLayoutChange,
  showFilter,
  showOrganizations,
  showDiscovery,
  onCloseFilter,
  onCloseOrganizations,
  onCloseDiscovery
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    repository?: RepositoryInfo;
    organization?: Organization;
  } | null>(null);

  const [showBulkOperations, setShowBulkOperations] = useState(false);

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
      {/* Simplified header - centralized sorting */}
      <div className="sidebar-header">
        <div className="sort-control">
          <select 
            className="sort-select"
            value={layout.sort_by}
            onChange={(e) => handleSortChange(e.target.value as RepositorySortBy)}
            title="Sort repositories"
          >
            <option value="name">Name</option>
            <option value="last_accessed">Last Accessed</option>
            <option value="last_commit">Last Commit</option>
            <option value="status">Status</option>
          </select>
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
                onClick={onCloseOrganizations ? () => onCloseOrganizations() : undefined}
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
              onClick={onCloseDiscovery}
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
      {showOrganizations && onCloseOrganizations && (
        <div className="organization-manager-modal">
          <div className="organization-manager-backdrop" onClick={onCloseOrganizations} />
          <div className="organization-manager-container">
            <OrganizationManager
              workspace={workspace}
              onClose={onCloseOrganizations}
            />
          </div>
        </div>
      )}

      {/* Repository Discovery Modal */}
      {showDiscovery && onCloseDiscovery && (
        <div className="repository-discovery-modal">
          <div className="repository-discovery-backdrop" onClick={onCloseDiscovery} />
          <div className="repository-discovery-container">
            <RepositoryDiscoveryPanel
              onClose={onCloseDiscovery}
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
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);

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
    const org = workspace.organizations.find(o => o.id === orgId);
    if (org) {
      setDeletingOrg(org);
    }
  };

  const confirmDeleteOrganization = async () => {
    if (!deletingOrg) return;
    
    try {
      // Move all repositories from this organization to ungrouped
      Object.values(workspace.repositories).forEach(repo => {
        if (repo.organization_id === deletingOrg.id) {
          updateRepository({ ...repo, organization_id: undefined });
        }
      });
      
      // Remove organization from database and state
      await invoke('delete_organization', { id: deletingOrg.id });
      removeOrganization(deletingOrg.id);
      
      setDeletingOrg(null);
    } catch (error) {
      console.error('Failed to delete organization:', error);
    }
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
        <div className="organizations-section">
          <h4>Organizations ({workspace.organizations.length})</h4>
          <div className="organizations-list">
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
                      aria-label="Edit organization"
                    >
                      <span style={{ fontSize: '14px' }}>✏️</span>
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteOrganization(org.id)}
                      title="Delete organization"
                      aria-label="Delete organization"
                    >
                      <span style={{ fontSize: '14px' }}>🗑️</span>
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

      {/* Delete Confirmation Modal */}
      {deletingOrg && (
        <div className="modal-overlay" onClick={() => setDeletingOrg(null)}>
          <div className="modal-content delete-confirmation" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🗑️ Delete Organization</div>
              <button 
                className="modal-close"
                onClick={() => setDeletingOrg(null)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="delete-warning">
                <div className="warning-icon">⚠️</div>
                <div className="warning-text">
                  <div><strong>Are you sure you want to delete "{deletingOrg.name}"?</strong></div>
                  <div>This action cannot be undone. All repositories in this organization will be moved to the ungrouped section.</div>
                  
                  {(() => {
                    const orgRepos = Object.values(workspace.repositories).filter(
                      repo => repo.organization_id === deletingOrg.id
                    );
                    return orgRepos.length > 0 ? (
                      <div style={{ marginTop: '12px' }}>
                        <strong>Repositories that will be moved:</strong>
                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                          {orgRepos.map(repo => (
                            <li key={repo.id}>{repo.name}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div style={{ marginTop: '12px', color: '#10b981' }}>
                        ✅ This organization is empty and can be safely deleted.
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="modal-btn cancel"
                onClick={() => setDeletingOrg(null)}
              >
                Cancel
              </button>
              <button 
                className="modal-btn delete"
                onClick={confirmDeleteOrganization}
              >
                Delete Organization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositorySidebar;