import React, { useCallback, useMemo, useState } from 'react';
import { RepositoryInfo, Organization } from '../../types/state';
import { useAppState } from '../../contexts/AppStateContext';
import BulkOperationsPanel from '../bulk/BulkOperationsPanel';
import './MultiSelectionManager.css';

interface MultiSelectionManagerProps {
  repositories: RepositoryInfo[];
  selectedRepositories: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  organizations?: Organization[];
  showBulkPanel?: boolean;
  onBulkPanelToggle?: (show: boolean) => void;
}

interface SelectionGroup {
  id: string;
  name: string;
  repositories: RepositoryInfo[];
  type: 'organization' | 'status' | 'custom';
  color?: string;
}

const MultiSelectionManager: React.FC<MultiSelectionManagerProps> = ({
  repositories,
  selectedRepositories,
  onSelectionChange,
  organizations = [],
  showBulkPanel = false,
  onBulkPanelToggle
}) => {
  const { state } = useAppState();
  const [showGroupSelectors, setShowGroupSelectors] = useState(false);

  // Create selection groups
  const selectionGroups = useMemo((): SelectionGroup[] => {
    const groups: SelectionGroup[] = [];

    // Organization groups
    organizations.forEach(org => {
      const orgRepos = repositories.filter(repo => repo.organization_id === org.id);
      if (orgRepos.length > 0) {
        groups.push({
          id: `org-${org.id}`,
          name: org.name,
          repositories: orgRepos,
          type: 'organization',
          color: org.color
        });
      }
    });

    // Status groups
    const statusGroups = {
      dirty: repositories.filter(repo => repo.is_dirty),
      conflicts: repositories.filter(repo => repo.has_conflicts),
      ahead: repositories.filter(repo => repo.sync_status === 'ahead'),
      behind: repositories.filter(repo => repo.sync_status === 'behind'),
      diverged: repositories.filter(repo => repo.sync_status === 'diverged'),
      favorites: repositories.filter(repo => repo.is_favorite)
    };

    Object.entries(statusGroups).forEach(([status, repos]) => {
      if (repos.length > 0) {
        groups.push({
          id: `status-${status}`,
          name: getStatusGroupName(status),
          repositories: repos,
          type: 'status'
        });
      }
    });

    return groups;
  }, [repositories, organizations]);

  // Selection statistics
  const selectionStats = useMemo(() => {
    const selectedRepos = repositories.filter(repo => selectedRepositories.has(repo.id));
    
    return {
      total: selectedRepositories.size,
      dirty: selectedRepos.filter(repo => repo.is_dirty).length,
      conflicts: selectedRepos.filter(repo => repo.has_conflicts).length,
      ahead: selectedRepos.filter(repo => repo.sync_status === 'ahead').length,
      behind: selectedRepos.filter(repo => repo.sync_status === 'behind').length,
      organizations: new Set(selectedRepos.map(repo => repo.organization_id).filter(Boolean)).size
    };
  }, [repositories, selectedRepositories]);

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(repositories.map(repo => repo.id));
    onSelectionChange(allIds);
  }, [repositories, onSelectionChange]);

  const handleSelectNone = useCallback(() => {
    onSelectionChange(new Set());
  }, [onSelectionChange]);

  const handleInvertSelection = useCallback(() => {
    const inverted = new Set(
      repositories
        .filter(repo => !selectedRepositories.has(repo.id))
        .map(repo => repo.id)
    );
    onSelectionChange(inverted);
  }, [repositories, selectedRepositories, onSelectionChange]);

  const handleSelectGroup = useCallback((group: SelectionGroup) => {
    const groupIds = new Set(group.repositories.map(repo => repo.id));
    const newSelected = new Set([...selectedRepositories, ...groupIds]);
    onSelectionChange(newSelected);
  }, [selectedRepositories, onSelectionChange]);

  const handleDeselectGroup = useCallback((group: SelectionGroup) => {
    const groupIds = new Set(group.repositories.map(repo => repo.id));
    const newSelected = new Set([...selectedRepositories].filter(id => !groupIds.has(id)));
    onSelectionChange(newSelected);
  }, [selectedRepositories, onSelectionChange]);

  const handleToggleGroup = useCallback((group: SelectionGroup) => {
    const groupIds = group.repositories.map(repo => repo.id);
    const allSelected = groupIds.every(id => selectedRepositories.has(id));
    
    if (allSelected) {
      handleDeselectGroup(group);
    } else {
      handleSelectGroup(group);
    }
  }, [selectedRepositories, handleSelectGroup, handleDeselectGroup]);

  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'a':
          e.preventDefault();
          handleSelectAll();
          break;
        case 'd':
          e.preventDefault();
          handleSelectNone();
          break;
        case 'i':
          e.preventDefault();
          handleInvertSelection();
          break;
        case 'b':
          e.preventDefault();
          onBulkPanelToggle?.(!showBulkPanel);
          break;
      }
    }
  }, [handleSelectAll, handleSelectNone, handleInvertSelection, showBulkPanel, onBulkPanelToggle]);

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);

  if (selectedRepositories.size === 0) {
    return null;
  }

  return (
    <>
      <div className="multi-selection-manager">
        <div className="selection-header">
          <div className="selection-info">
            <div className="selection-count">
              <span className="count-number">{selectedRepositories.size}</span>
              <span className="count-label">
                {selectedRepositories.size === 1 ? 'repository' : 'repositories'} selected
              </span>
            </div>
            {selectionStats.organizations > 0 && (
              <div className="selection-detail">
                from {selectionStats.organizations} organization{selectionStats.organizations > 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div className="selection-actions">
            <button
              className="action-button secondary"
              onClick={() => setShowGroupSelectors(!showGroupSelectors)}
              title="Group selection options"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 9.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
              </svg>
            </button>

            <button
              className="action-button secondary"
              onClick={handleInvertSelection}
              title="Invert selection (Ctrl+I)"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.5 3.5a.5.5 0 01.5-.5h10a.5.5 0 01.5.5v9a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5v-9zm2 1v7h7v-7H4.5z"/>
              </svg>
            </button>

            <button
              className="action-button secondary"
              onClick={handleSelectNone}
              title="Clear selection (Ctrl+D)"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
              </svg>
            </button>

            <button
              className={`action-button primary ${showBulkPanel ? 'active' : ''}`}
              onClick={() => onBulkPanelToggle?.(!showBulkPanel)}
              title="Bulk operations (Ctrl+B)"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.75 2.5a.25.25 0 00-.25.25v1.5c0 .138.112.25.25.25h1.5a.25.25 0 00.25-.25v-1.5a.25.25 0 00-.25-.25h-1.5zM6 3.75A.75.75 0 016.75 3h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 016 3.75zM6.75 7a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5zM6 11.25a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM1.75 6.5a.25.25 0 00-.25.25v1.5c0 .138.112.25.25.25h1.5a.25.25 0 00.25-.25v-1.5a.25.25 0 00-.25-.25h-1.5zM1.5 10.75a.25.25 0 01.25-.25h1.5a.25.25 0 01.25.25v1.5a.25.25 0 01-.25.25h-1.5a.25.25 0 01-.25-.25v-1.5z"/>
              </svg>
              Bulk Actions
            </button>
          </div>
        </div>

        {/* Selection stats */}
        <div className="selection-stats">
          <div className="stats-grid">
            {selectionStats.dirty > 0 && (
              <div className="stat-item">
                <div className="stat-icon dirty">●</div>
                <span>{selectionStats.dirty} with changes</span>
              </div>
            )}
            {selectionStats.conflicts > 0 && (
              <div className="stat-item">
                <div className="stat-icon conflicts">⚠️</div>
                <span>{selectionStats.conflicts} with conflicts</span>
              </div>
            )}
            {selectionStats.ahead > 0 && (
              <div className="stat-item">
                <div className="stat-icon ahead">↑</div>
                <span>{selectionStats.ahead} ahead</span>
              </div>
            )}
            {selectionStats.behind > 0 && (
              <div className="stat-item">
                <div className="stat-icon behind">↓</div>
                <span>{selectionStats.behind} behind</span>
              </div>
            )}
          </div>
        </div>

        {/* Group selectors */}
        {showGroupSelectors && (
          <div className="group-selectors">
            <div className="group-selector-header">
              <h4>Quick Selection</h4>
              <button
                className="close-button"
                onClick={() => setShowGroupSelectors(false)}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                </svg>
              </button>
            </div>

            <div className="global-selectors">
              <button className="selector-button" onClick={handleSelectAll}>
                <span>Select All</span>
                <span className="count">({repositories.length})</span>
              </button>
              <button className="selector-button" onClick={handleSelectNone}>
                <span>Clear All</span>
              </button>
              <button className="selector-button" onClick={handleInvertSelection}>
                <span>Invert Selection</span>
              </button>
            </div>

            <div className="group-selector-grid">
              {selectionGroups.map(group => {
                const groupIds = group.repositories.map(repo => repo.id);
                const selectedCount = groupIds.filter(id => selectedRepositories.has(id)).length;
                const isFullySelected = selectedCount === groupIds.length;
                const isPartiallySelected = selectedCount > 0 && selectedCount < groupIds.length;

                return (
                  <div key={group.id} className="group-selector-item">
                    <button
                      className={`group-toggle ${isFullySelected ? 'selected' : ''} ${isPartiallySelected ? 'partial' : ''}`}
                      onClick={() => handleToggleGroup(group)}
                    >
                      <div className="group-header">
                        {group.color && (
                          <div
                            className="group-color"
                            style={{ backgroundColor: group.color }}
                          />
                        )}
                        <span className="group-name">{group.name}</span>
                        <div className="selection-indicator">
                          {isFullySelected ? (
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                            </svg>
                          ) : isPartiallySelected ? (
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M4 8a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 014 8z"/>
                            </svg>
                          ) : (
                            <div className="empty-checkbox" />
                          )}
                        </div>
                      </div>
                      <div className="group-stats">
                        <span className="selected-count">{selectedCount}/{group.repositories.length}</span>
                        <span className="group-type">{group.type}</span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bulk operations panel */}
      {showBulkPanel && (
        <div className="bulk-operations-overlay">
          <div className="bulk-operations-container">
            <BulkOperationsPanel
              repositories={repositories}
              selectedRepositories={selectedRepositories}
              onClose={() => onBulkPanelToggle?.(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

// Helper function to get readable names for status groups
function getStatusGroupName(status: string): string {
  switch (status) {
    case 'dirty':
      return 'With Changes';
    case 'conflicts':
      return 'With Conflicts';
    case 'ahead':
      return 'Ahead of Remote';
    case 'behind':
      return 'Behind Remote';
    case 'diverged':
      return 'Diverged';
    case 'favorites':
      return 'Favorites';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export default MultiSelectionManager;