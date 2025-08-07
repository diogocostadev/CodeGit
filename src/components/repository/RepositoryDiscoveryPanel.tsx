import React, { useState } from 'react';
import { useRepositoryDiscovery } from '../../hooks/useRepositoryDiscovery';
import { RepositoryInfo, Organization } from '../../types/state';
import './RepositoryDiscoveryPanel.css';

interface RepositoryDiscoveryPanelProps {
  watchPaths?: string[];
  onClose?: () => void;
}

const RepositoryDiscoveryPanel: React.FC<RepositoryDiscoveryPanelProps> = ({
  watchPaths = [],
  onClose
}) => {
  const [selectedTab, setSelectedTab] = useState<'found' | 'organizations'>('found');
  const [scanPath, setScanPath] = useState('');
  
  const {
    isScanning,
    foundRepositories,
    suggestedOrganizations,
    scanDirectory,
    scanMultiplePaths,
    addRepository,
    removeRepository,
    acceptOrganization,
    rejectOrganization,
    startWatching,
    stopWatching,
    error,
    clearError
  } = useRepositoryDiscovery({
    watchPaths,
    autoDetect: true,
    autoGroup: true,
    scanDepth: 3
  });

  const handleScanDirectory = async () => {
    if (!scanPath.trim()) return;
    await scanDirectory(scanPath.trim());
    setScanPath('');
  };

  const handleScanCommonPaths = async () => {
    const commonPaths = [
      'C:\\Users\\%USERNAME%\\Documents\\GitHub',
      'C:\\Users\\%USERNAME%\\Documents\\Projects',
      'C:\\Projects',
      'C:\\Code',
      'D:\\Projects',
      'D:\\Code'
    ].map(path => path.replace('%USERNAME%', process.env.USERNAME || ''));
    
    await scanMultiplePaths(commonPaths);
  };

  const handleAddRepository = async (repo: RepositoryInfo) => {
    await addRepository(repo.path);
  };

  const handleRemoveFromFound = (repoId: string) => {
    // This removes from the found list, not from the actual state
    // We would need to implement this in the hook
    console.log('Remove from found:', repoId);
  };

  return (
    <div className="repository-discovery-panel">
      <div className="discovery-header">
        <h2>Repository Discovery</h2>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button className="error-dismiss" onClick={clearError}>×</button>
        </div>
      )}

      {/* Scan Controls */}
      <div className="scan-controls">
        <div className="scan-input-group">
          <input
            type="text"
            className="scan-input"
            placeholder="Enter directory path to scan..."
            value={scanPath}
            onChange={(e) => setScanPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScanDirectory()}
          />
          <button 
            className="scan-button"
            onClick={handleScanDirectory}
            disabled={isScanning || !scanPath.trim()}
          >
            {isScanning ? 'Scanning...' : 'Scan'}
          </button>
        </div>
        
        <div className="quick-scan-buttons">
          <button 
            className="quick-scan-button"
            onClick={handleScanCommonPaths}
            disabled={isScanning}
          >
            Scan Common Locations
          </button>
          <button 
            className="quick-scan-button"
            onClick={() => scanDirectory(process.env.HOME || 'C:\\')}
            disabled={isScanning}
          >
            Scan Home Directory
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {isScanning && (
        <div className="scanning-indicator">
          <div className="spinner"></div>
          <span>Scanning for repositories...</span>
        </div>
      )}

      {/* Tabs */}
      <div className="discovery-tabs">
        <button 
          className={`tab-button ${selectedTab === 'found' ? 'active' : ''}`}
          onClick={() => setSelectedTab('found')}
        >
          Found Repositories ({foundRepositories.length})
        </button>
        <button 
          className={`tab-button ${selectedTab === 'organizations' ? 'active' : ''}`}
          onClick={() => setSelectedTab('organizations')}
        >
          Organization Suggestions ({suggestedOrganizations.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {selectedTab === 'found' && (
          <FoundRepositoriesTab
            repositories={foundRepositories}
            onAddRepository={handleAddRepository}
            onRemoveFromFound={handleRemoveFromFound}
          />
        )}
        
        {selectedTab === 'organizations' && (
          <OrganizationSuggestionsTab
            organizations={suggestedOrganizations}
            onAcceptOrganization={acceptOrganization}
            onRejectOrganization={rejectOrganization}
          />
        )}
      </div>
    </div>
  );
};

const FoundRepositoriesTab: React.FC<{
  repositories: RepositoryInfo[];
  onAddRepository: (repo: RepositoryInfo) => void;
  onRemoveFromFound: (repoId: string) => void;
}> = ({ repositories, onAddRepository, onRemoveFromFound }) => {
  if (repositories.length === 0) {
    return (
      <div className="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        <p>No repositories found</p>
        <p className="empty-subtitle">Try scanning a different directory</p>
      </div>
    );
  }

  return (
    <div className="found-repositories">
      {repositories.map(repo => (
        <div key={repo.id} className="found-repo-item">
          <div className="repo-info">
            <div className="repo-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"/>
              </svg>
            </div>
            <div className="repo-details">
              <div className="repo-name">{repo.name}</div>
              <div className="repo-path">{repo.path}</div>
              <div className="repo-branch">Branch: {repo.current_branch}</div>
            </div>
          </div>
          <div className="repo-actions">
            <button
              className="action-button primary"
              onClick={() => onAddRepository(repo)}
            >
              Add
            </button>
            <button
              className="action-button secondary"
              onClick={() => onRemoveFromFound(repo.id)}
            >
              Ignore
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const OrganizationSuggestionsTab: React.FC<{
  organizations: Organization[];
  onAcceptOrganization: (orgId: string) => void;
  onRejectOrganization: (orgId: string) => void;
}> = ({ organizations, onAcceptOrganization, onRejectOrganization }) => {
  if (organizations.length === 0) {
    return (
      <div className="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
          <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4h2v-7.5c0-.83.67-1.5 1.5-1.5S12 9.67 12 10.5V18h2v-7.5c0-.83.67-1.5 1.5-1.5S17 9.67 17 10.5V18h3v4H4z"/>
        </svg>
        <p>No organization suggestions</p>
        <p className="empty-subtitle">Add more repositories to get organization suggestions</p>
      </div>
    );
  }

  return (
    <div className="organization-suggestions">
      {organizations.map(org => (
        <div key={org.id} className="org-suggestion-item">
          <div className="org-info">
            <div className="org-header">
              <div 
                className="org-color" 
                style={{ backgroundColor: org.color }}
              />
              <div className="org-name">{org.name}</div>
              <div className="repo-count">
                {org.repositories.length} repositories
              </div>
            </div>
            <div className="org-description">{org.description}</div>
            <div className="org-repositories">
              {org.repositories.slice(0, 3).map((repoId, index) => (
                <span key={repoId} className="repo-tag">
                  Repository {index + 1}
                </span>
              ))}
              {org.repositories.length > 3 && (
                <span className="repo-tag more">
                  +{org.repositories.length - 3} more
                </span>
              )}
            </div>
          </div>
          <div className="org-actions">
            <button
              className="action-button primary"
              onClick={() => onAcceptOrganization(org.id)}
            >
              Create Organization
            </button>
            <button
              className="action-button secondary"
              onClick={() => onRejectOrganization(org.id)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RepositoryDiscoveryPanel;