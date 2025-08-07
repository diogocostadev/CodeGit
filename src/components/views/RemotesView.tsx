import React, { useState, useEffect, useMemo } from 'react';
import { RepositoryInfo, MainViewState } from '../../types/state';
import './RemotesView.css';

interface Remote {
  name: string;
  url: string;
  type: 'fetch' | 'push' | 'both';
  is_default: boolean;
  branches: RemoteBranch[];
  last_fetch: number;
  status: 'connected' | 'error' | 'unknown';
}

interface RemoteBranch {
  name: string;
  full_name: string;
  commit_id: string;
  commit_message: string;
  commit_author: string;
  commit_date: number;
  is_tracking: boolean;
  ahead_count: number;
  behind_count: number;
}

interface RemotesViewProps {
  repository: RepositoryInfo;
  layout: MainViewState;
  onLayoutChange: (changes: Partial<MainViewState>) => void;
}

const RemotesView: React.FC<RemotesViewProps> = ({
  repository,
  layout,
  onLayoutChange
}) => {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [selectedRemote, setSelectedRemote] = useState<Remote | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddRemote, setShowAddRemote] = useState(false);
  const [newRemote, setNewRemote] = useState({ name: '', url: '' });
  const [activeTab, setActiveTab] = useState<'overview' | 'branches' | 'config'>('overview');

  useEffect(() => {
    if (repository) {
      loadRemotes();
    }
  }, [repository]);

  const loadRemotes = async () => {
    try {
      setLoading(true);
      // Mock data - in real implementation, this would call the Rust backend
      const mockRemotes: Remote[] = [
        {
          name: 'origin',
          url: 'https://github.com/user/repo.git',
          type: 'both',
          is_default: true,
          last_fetch: Date.now() - 300000, // 5 minutes ago
          status: 'connected',
          branches: [
            {
              name: 'main',
              full_name: 'origin/main',
              commit_id: 'abc1234',
              commit_message: 'feat: implement new authentication system',
              commit_author: 'John Doe',
              commit_date: Date.now() - 7200000, // 2 hours ago
              is_tracking: true,
              ahead_count: 0,
              behind_count: 2
            },
            {
              name: 'develop',
              full_name: 'origin/develop',
              commit_id: 'def5678',
              commit_message: 'fix: resolve memory leak in worker thread',
              commit_author: 'Jane Smith',
              commit_date: Date.now() - 3600000, // 1 hour ago
              is_tracking: false,
              ahead_count: 3,
              behind_count: 0
            },
            {
              name: 'feature/ui-redesign',
              full_name: 'origin/feature/ui-redesign',
              commit_id: 'ghi9012',
              commit_message: 'style: update component styling',
              commit_author: 'Alice Brown',
              commit_date: Date.now() - 1800000, // 30 minutes ago
              is_tracking: false,
              ahead_count: 5,
              behind_count: 1
            }
          ]
        },
        {
          name: 'upstream',
          url: 'https://github.com/original/repo.git',
          type: 'fetch',
          is_default: false,
          last_fetch: Date.now() - 86400000, // 1 day ago
          status: 'connected',
          branches: [
            {
              name: 'main',
              full_name: 'upstream/main',
              commit_id: 'xyz3456',
              commit_message: 'docs: update API documentation',
              commit_author: 'Upstream Maintainer',
              commit_date: Date.now() - 43200000, // 12 hours ago
              is_tracking: false,
              ahead_count: 0,
              behind_count: 5
            }
          ]
        },
        {
          name: 'fork',
          url: 'https://github.com/contributor/repo.git',
          type: 'push',
          is_default: false,
          last_fetch: 0,
          status: 'error',
          branches: []
        }
      ];

      setRemotes(mockRemotes);
      setSelectedRemote(mockRemotes[0]);
    } catch (error) {
      console.error('Failed to load remotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRemote = async () => {
    if (!newRemote.name || !newRemote.url) return;

    try {
      const remote: Remote = {
        name: newRemote.name,
        url: newRemote.url,
        type: 'both',
        is_default: remotes.length === 0,
        last_fetch: 0,
        status: 'unknown',
        branches: []
      };

      setRemotes(prev => [...prev, remote]);
      setNewRemote({ name: '', url: '' });
      setShowAddRemote(false);
      
      console.log('Adding remote:', remote);
      // Here we would call the Rust backend to actually add the remote
    } catch (error) {
      console.error('Failed to add remote:', error);
    }
  };

  const handleRemoveRemote = async (remoteName: string) => {
    if (!window.confirm(`Are you sure you want to remove remote "${remoteName}"?`)) {
      return;
    }

    try {
      setRemotes(prev => prev.filter(r => r.name !== remoteName));
      if (selectedRemote?.name === remoteName) {
        setSelectedRemote(remotes[0] || null);
      }
      
      console.log('Removing remote:', remoteName);
      // Here we would call the Rust backend
    } catch (error) {
      console.error('Failed to remove remote:', error);
    }
  };

  const handleFetchRemote = async (remoteName: string) => {
    try {
      console.log('Fetching from remote:', remoteName);
      // Here we would call the Rust backend to fetch
      
      // Update last_fetch timestamp
      setRemotes(prev => prev.map(r => 
        r.name === remoteName 
          ? { ...r, last_fetch: Date.now(), status: 'connected' }
          : r
      ));
    } catch (error) {
      console.error('Failed to fetch from remote:', error);
    }
  };

  const handleTrackBranch = async (remoteName: string, branchName: string) => {
    try {
      console.log('Tracking branch:', `${remoteName}/${branchName}`);
      // Here we would call the Rust backend to set up tracking
      
      setRemotes(prev => prev.map(remote => 
        remote.name === remoteName
          ? {
              ...remote,
              branches: remote.branches.map(branch =>
                branch.name === branchName
                  ? { ...branch, is_tracking: true }
                  : branch
              )
            }
          : remote
      ));
    } catch (error) {
      console.error('Failed to track branch:', error);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getRemoteTypeIcon = (type: Remote['type']) => {
    switch (type) {
      case 'both': return '↕️';
      case 'fetch': return '⬇️';
      case 'push': return '⬆️';
      default: return '🔗';
    }
  };

  const getStatusIcon = (status: Remote['status']) => {
    switch (status) {
      case 'connected': return '✅';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  const remotesStats = useMemo(() => {
    const totalBranches = remotes.reduce((sum, r) => sum + r.branches.length, 0);
    const trackingBranches = remotes.reduce((sum, r) => 
      sum + r.branches.filter(b => b.is_tracking).length, 0);
    const connectedRemotes = remotes.filter(r => r.status === 'connected').length;

    return {
      totalRemotes: remotes.length,
      totalBranches,
      trackingBranches,
      connectedRemotes
    };
  }, [remotes]);

  if (loading) {
    return (
      <div className="remotes-view">
        <div className="remotes-loading">
          <div className="loading-spinner"></div>
          <p>Loading remotes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="remotes-view">
      {/* Header */}
      <div className="remotes-header">
        <div className="remotes-title-section">
          <h2>Remote Repositories</h2>
          <div className="remotes-subtitle">
            <span>🏛️ {repository.name}</span>
            <span>•</span>
            <span>{remotesStats.totalRemotes} remotes</span>
            <span>•</span>
            <span>{remotesStats.totalBranches} remote branches</span>
          </div>
        </div>

        <div className="remotes-actions">
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => loadRemotes()}
            title="Refresh remotes"
          >
            🔄 Refresh
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddRemote(true)}
          >
            ➕ Add Remote
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="remotes-stats">
        <div className="stat-card">
          <span className="stat-value">{remotesStats.totalRemotes}</span>
          <span className="stat-label">Remotes</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{remotesStats.connectedRemotes}</span>
          <span className="stat-label">Connected</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{remotesStats.trackingBranches}</span>
          <span className="stat-label">Tracking</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{remotesStats.totalBranches}</span>
          <span className="stat-label">Remote Branches</span>
        </div>
      </div>

      <div className="remotes-content">
        {/* Remotes List */}
        <div className="remotes-sidebar">
          <div className="remotes-list-header">
            <h3>Remote Repositories</h3>
          </div>
          <div className="remotes-list">
            {remotes.map(remote => (
              <div
                key={remote.name}
                className={`remote-item ${selectedRemote?.name === remote.name ? 'selected' : ''}`}
                onClick={() => setSelectedRemote(remote)}
              >
                <div className="remote-info">
                  <div className="remote-name-row">
                    <span className="remote-icon">{getRemoteTypeIcon(remote.type)}</span>
                    <span className="remote-name">{remote.name}</span>
                    <span className="remote-status">{getStatusIcon(remote.status)}</span>
                    {remote.is_default && <span className="default-badge">DEFAULT</span>}
                  </div>
                  <div className="remote-url">{remote.url}</div>
                  <div className="remote-meta">
                    <span>{remote.branches.length} branches</span>
                    <span>•</span>
                    <span>Last fetch: {formatTimeAgo(remote.last_fetch)}</span>
                  </div>
                </div>
                <div className="remote-actions">
                  <button
                    className="remote-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFetchRemote(remote.name);
                    }}
                    title="Fetch from remote"
                  >
                    ⬇️
                  </button>
                  <button
                    className="remote-action-btn danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRemote(remote.name);
                    }}
                    title="Remove remote"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            {remotes.length === 0 && (
              <div className="empty-remotes">
                <div className="empty-icon">🔗</div>
                <h4>No Remotes</h4>
                <p>Add a remote repository to start collaborating</p>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddRemote(true)}
                >
                  Add Remote
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Remote Details */}
        {selectedRemote ? (
          <div className="remote-details">
            <div className="remote-details-header">
              <h3>{selectedRemote.name}</h3>
              <div className="remote-tabs">
                <button
                  className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  📊 Overview
                </button>
                <button
                  className={`tab ${activeTab === 'branches' ? 'active' : ''}`}
                  onClick={() => setActiveTab('branches')}
                >
                  🌿 Branches ({selectedRemote.branches.length})
                </button>
                <button
                  className={`tab ${activeTab === 'config' ? 'active' : ''}`}
                  onClick={() => setActiveTab('config')}
                >
                  ⚙️ Configuration
                </button>
              </div>
            </div>

            <div className="remote-details-content">
              {activeTab === 'overview' && (
                <div className="remote-overview">
                  <div className="overview-section">
                    <h4>Remote Information</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Name:</label>
                        <span>{selectedRemote.name}</span>
                      </div>
                      <div className="info-item">
                        <label>URL:</label>
                        <span className="monospace">{selectedRemote.url}</span>
                      </div>
                      <div className="info-item">
                        <label>Type:</label>
                        <span>{selectedRemote.type} {getRemoteTypeIcon(selectedRemote.type)}</span>
                      </div>
                      <div className="info-item">
                        <label>Status:</label>
                        <span className={`status ${selectedRemote.status}`}>
                          {getStatusIcon(selectedRemote.status)} {selectedRemote.status}
                        </span>
                      </div>
                      <div className="info-item">
                        <label>Default:</label>
                        <span>{selectedRemote.is_default ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="info-item">
                        <label>Last Fetch:</label>
                        <span>{formatTimeAgo(selectedRemote.last_fetch)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="overview-section">
                    <h4>Quick Actions</h4>
                    <div className="quick-actions">
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleFetchRemote(selectedRemote.name)}
                      >
                        ⬇️ Fetch
                      </button>
                      <button 
                        className="btn btn-secondary"
                        disabled={selectedRemote.type === 'fetch'}
                      >
                        ⬆️ Push
                      </button>
                      <button 
                        className="btn btn-secondary"
                        disabled={selectedRemote.type === 'push'}
                      >
                        🔄 Pull
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={() => handleRemoveRemote(selectedRemote.name)}
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'branches' && (
                <div className="remote-branches">
                  {selectedRemote.branches.length === 0 ? (
                    <div className="empty-branches">
                      <div className="empty-icon">🌿</div>
                      <h4>No Branches</h4>
                      <p>Fetch from this remote to see available branches</p>
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleFetchRemote(selectedRemote.name)}
                      >
                        Fetch Now
                      </button>
                    </div>
                  ) : (
                    <div className="branches-list">
                      {selectedRemote.branches.map(branch => (
                        <div key={branch.full_name} className="branch-item">
                          <div className="branch-header">
                            <div className="branch-name">
                              <span className="branch-icon">🌿</span>
                              <span>{branch.name}</span>
                              {branch.is_tracking && <span className="tracking-badge">TRACKING</span>}
                            </div>
                            <div className="branch-actions">
                              {!branch.is_tracking && (
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => handleTrackBranch(selectedRemote.name, branch.name)}
                                >
                                  Track
                                </button>
                              )}
                              <button className="btn btn-sm btn-secondary">
                                Checkout
                              </button>
                            </div>
                          </div>
                          <div className="branch-info">
                            <div className="commit-info">
                              <span className="commit-hash">#{branch.commit_id}</span>
                              <span className="commit-message">{branch.commit_message}</span>
                            </div>
                            <div className="branch-meta">
                              <span>by {branch.commit_author}</span>
                              <span>•</span>
                              <span>{formatTimeAgo(branch.commit_date)}</span>
                              {(branch.ahead_count > 0 || branch.behind_count > 0) && (
                                <>
                                  <span>•</span>
                                  {branch.ahead_count > 0 && (
                                    <span className="ahead">↑{branch.ahead_count}</span>
                                  )}
                                  {branch.behind_count > 0 && (
                                    <span className="behind">↓{branch.behind_count}</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'config' && (
                <div className="remote-config">
                  <div className="config-section">
                    <h4>Configuration</h4>
                    <div className="config-form">
                      <div className="form-group">
                        <label>Remote Name:</label>
                        <input 
                          type="text" 
                          value={selectedRemote.name}
                          disabled
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Fetch URL:</label>
                        <input 
                          type="text" 
                          value={selectedRemote.url}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Push URL:</label>
                        <input 
                          type="text" 
                          value={selectedRemote.url}
                          className="form-input"
                          disabled={selectedRemote.type === 'fetch'}
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          <input 
                            type="checkbox" 
                            checked={selectedRemote.is_default}
                          />
                          Set as default remote
                        </label>
                      </div>
                    </div>
                    <div className="config-actions">
                      <button className="btn btn-primary">Save Changes</button>
                      <button className="btn btn-secondary">Reset</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="no-remote-selected">
            <div className="empty-icon">🔗</div>
            <h3>Select a Remote</h3>
            <p>Choose a remote repository from the list to view details</p>
          </div>
        )}
      </div>

      {/* Add Remote Modal */}
      {showAddRemote && (
        <div className="modal-overlay" onClick={() => setShowAddRemote(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Remote Repository</h3>
              <button 
                className="modal-close-button"
                onClick={() => setShowAddRemote(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Remote Name:</label>
                <input
                  type="text"
                  value={newRemote.name}
                  onChange={(e) => setNewRemote(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="origin, upstream, fork..."
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Remote URL:</label>
                <input
                  type="text"
                  value={newRemote.url}
                  onChange={(e) => setNewRemote(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://github.com/user/repo.git"
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowAddRemote(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAddRemote}
                disabled={!newRemote.name || !newRemote.url}
              >
                Add Remote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemotesView;