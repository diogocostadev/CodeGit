import { useState, useEffect } from "react";
import "./BranchManager.css";
import "./design-system.css";

interface RepositoryInfo {
  name: string;
  path: string;
  current_branch: string;
  last_commit: string;
  is_dirty: boolean;
  last_accessed: number;
}

interface GitBranch {
  name: string;
  is_head: boolean;
  is_remote: boolean;
  target?: string;
  ahead?: number;
  behind?: number;
  last_commit?: string;
  last_commit_message?: string;
  last_commit_author?: string;
  last_commit_date?: number;
  protection_rules?: BranchProtection;
}

interface BranchProtection {
  prevent_force_push: boolean;
  require_pull_request: boolean;
  require_review: boolean;
  dismiss_stale_reviews: boolean;
}

interface BranchManagerProps {
  repository: RepositoryInfo;
  onNavigate: (screen: string) => void;
}

type ViewMode = 'grid' | 'list' | 'tree';
type FilterMode = 'all' | 'local' | 'remote' | 'stale';

const BranchManager: React.FC<BranchManagerProps> = ({ repository, onNavigate }) => {
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<GitBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchSource, setNewBranchSource] = useState('');
  const [branchToDelete, setBranchToDelete] = useState<GitBranch | null>(null);
  const [showProtectionModal, setShowProtectionModal] = useState(false);
  const [protectionBranch, setProtectionBranch] = useState<GitBranch | null>(null);

  useEffect(() => {
    if (repository) {
      loadBranches();
    }
  }, [repository]);

  useEffect(() => {
    applyFilters();
  }, [branches, filterMode, searchQuery]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      // Simular carregamento de branches
      const mockBranches: GitBranch[] = generateMockBranches();
      setBranches(mockBranches);
    } catch (error) {
      console.error("Failed to load branches:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockBranches = (): GitBranch[] => {
    const baseTime = Date.now() / 1000;
    
    return [
      {
        name: 'main',
        is_head: true,
        is_remote: false,
        target: 'a1b2c3d4',
        ahead: 0,
        behind: 0,
        last_commit: 'a1b2c3d4',
        last_commit_message: 'Update main README and documentation',
        last_commit_author: 'John Doe',
        last_commit_date: baseTime - 3600,
        protection_rules: {
          prevent_force_push: true,
          require_pull_request: true,
          require_review: true,
          dismiss_stale_reviews: false
        }
      },
      {
        name: 'develop',
        is_head: false,
        is_remote: false,
        target: 'b2c3d4e5',
        ahead: 5,
        behind: 2,
        last_commit: 'b2c3d4e5',
        last_commit_message: 'Add new authentication system',
        last_commit_author: 'Jane Smith',
        last_commit_date: baseTime - 7200,
        protection_rules: {
          prevent_force_push: false,
          require_pull_request: true,
          require_review: false,
          dismiss_stale_reviews: false
        }
      },
      {
        name: 'feature/user-dashboard',
        is_head: false,
        is_remote: false,
        target: 'c3d4e5f6',
        ahead: 8,
        behind: 1,
        last_commit: 'c3d4e5f6',
        last_commit_message: 'Implement user dashboard with charts',
        last_commit_author: 'Bob Wilson',
        last_commit_date: baseTime - 1800,
        protection_rules: {
          prevent_force_push: false,
          require_pull_request: false,
          require_review: false,
          dismiss_stale_reviews: false
        }
      },
      {
        name: 'feature/api-integration',
        is_head: false,
        is_remote: false,
        target: 'd4e5f6g7',
        ahead: 3,
        behind: 4,
        last_commit: 'd4e5f6g7',
        last_commit_message: 'Add REST API endpoints',
        last_commit_author: 'Alice Brown',
        last_commit_date: baseTime - 10800,
        protection_rules: {
          prevent_force_push: false,
          require_pull_request: false,
          require_review: false,
          dismiss_stale_reviews: false
        }
      },
      {
        name: 'bugfix/login-validation',
        is_head: false,
        is_remote: false,
        target: 'e5f6g7h8',
        ahead: 2,
        behind: 0,
        last_commit: 'e5f6g7h8',
        last_commit_message: 'Fix login validation edge cases',
        last_commit_author: 'Charlie Davis',
        last_commit_date: baseTime - 5400,
        protection_rules: {
          prevent_force_push: false,
          require_pull_request: false,
          require_review: false,
          dismiss_stale_reviews: false
        }
      },
      {
        name: 'origin/main',
        is_head: false,
        is_remote: true,
        target: 'a1b2c3d4',
        ahead: 0,
        behind: 0,
        last_commit: 'a1b2c3d4',
        last_commit_message: 'Update main README and documentation',
        last_commit_author: 'John Doe',
        last_commit_date: baseTime - 3600
      },
      {
        name: 'origin/develop',
        is_head: false,
        is_remote: true,
        target: 'f6g7h8i9',
        ahead: 0,
        behind: 0,
        last_commit: 'f6g7h8i9',
        last_commit_message: 'Merge branch features into develop',
        last_commit_author: 'Jane Smith',
        last_commit_date: baseTime - 14400
      },
      {
        name: 'hotfix/critical-security',
        is_head: false,
        is_remote: false,
        target: 'g7h8i9j0',
        ahead: 1,
        behind: 0,
        last_commit: 'g7h8i9j0',
        last_commit_message: 'Fix critical security vulnerability',
        last_commit_author: 'Security Team',
        last_commit_date: baseTime - 900,
        protection_rules: {
          prevent_force_push: true,
          require_pull_request: true,
          require_review: true,
          dismiss_stale_reviews: true
        }
      }
    ];
  };

  const applyFilters = () => {
    let filtered = branches;

    // Filter by type
    switch (filterMode) {
      case 'local':
        filtered = filtered.filter(b => !b.is_remote);
        break;
      case 'remote':
        filtered = filtered.filter(b => b.is_remote);
        break;
      case 'stale':
        const thirtyDaysAgo = Date.now() / 1000 - (30 * 24 * 60 * 60);
        filtered = filtered.filter(b => !b.is_remote && b.last_commit_date && b.last_commit_date < thirtyDaysAgo);
        break;
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(b => 
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.last_commit_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.last_commit_author?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredBranches(filtered);
  };

  const createBranch = async () => {
    if (!newBranchName.trim()) return;

    try {
      console.log(`Creating branch ${newBranchName} from ${newBranchSource || 'current'}`);
      
      // Simular criação de branch
      const newBranch: GitBranch = {
        name: newBranchName,
        is_head: false,
        is_remote: false,
        target: 'new123abc',
        ahead: 0,
        behind: 0,
        last_commit: 'new123abc',
        last_commit_message: `Initial commit for ${newBranchName}`,
        last_commit_author: 'Current User',
        last_commit_date: Date.now() / 1000,
        protection_rules: {
          prevent_force_push: false,
          require_pull_request: false,
          require_review: false,
          dismiss_stale_reviews: false
        }
      };

      setBranches(prev => [...prev, newBranch]);
      setShowCreateModal(false);
      setNewBranchName('');
      setNewBranchSource('');
    } catch (error) {
      console.error("Failed to create branch:", error);
    }
  };

  const deleteBranch = async (branch: GitBranch) => {
    if (!branch || branch.is_head) return;

    try {
      console.log(`Deleting branch ${branch.name}`);
      setBranches(prev => prev.filter(b => b.name !== branch.name));
      setShowDeleteModal(false);
      setBranchToDelete(null);
    } catch (error) {
      console.error("Failed to delete branch:", error);
    }
  };

  const switchToBranch = async (branchName: string) => {
    try {
      console.log(`Switching to branch ${branchName}`);
      setBranches(prev => prev.map(b => ({
        ...b,
        is_head: b.name === branchName
      })));
    } catch (error) {
      console.error("Failed to switch branch:", error);
    }
  };

  const mergeBranch = async (sourceBranch: string, targetBranch: string) => {
    console.log(`Merging ${sourceBranch} into ${targetBranch}`);
    onNavigate('merge');
  };

  // const renameBranch = async (oldName: string, newName: string) => {
  //   if (!newName.trim()) return;

  //   try {
  //     console.log(`Renaming branch ${oldName} to ${newName}`);
  //     setBranches(prev => prev.map(b => 
  //       b.name === oldName ? { ...b, name: newName } : b
  //     ));
  //   } catch (error) {
  //     console.error("Failed to rename branch:", error);
  //   }
  // };

  const updateProtectionRules = async (branchName: string, rules: BranchProtection) => {
    try {
      console.log(`Updating protection rules for ${branchName}:`, rules);
      setBranches(prev => prev.map(b => 
        b.name === branchName ? { ...b, protection_rules: rules } : b
      ));
      setShowProtectionModal(false);
      setProtectionBranch(null);
    } catch (error) {
      console.error("Failed to update protection rules:", error);
    }
  };

  const bulkDeleteBranches = async () => {
    if (selectedBranches.length === 0) return;

    try {
      console.log(`Bulk deleting branches:`, selectedBranches);
      setBranches(prev => prev.filter(b => !selectedBranches.includes(b.name) || b.is_head));
      setSelectedBranches([]);
    } catch (error) {
      console.error("Failed to bulk delete branches:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "agora";
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getBranchType = (branchName: string) => {
    if (branchName === 'main' || branchName === 'master') return 'main';
    if (branchName.startsWith('feature/')) return 'feature';
    if (branchName.startsWith('bugfix/')) return 'bugfix';
    if (branchName.startsWith('hotfix/')) return 'hotfix';
    if (branchName === 'develop') return 'develop';
    return 'other';
  };

  const getBranchIcon = (branch: GitBranch) => {
    if (branch.is_remote) return '🌐';
    if (branch.is_head) return '👑';
    
    const type = getBranchType(branch.name);
    switch (type) {
      case 'main': return '🏛️';
      case 'feature': return '✨';
      case 'bugfix': return '🐛';
      case 'hotfix': return '🚨';
      case 'develop': return '🔨';
      default: return '🌿';
    }
  };

  const getStatusColor = (branch: GitBranch) => {
    if (branch.is_head) return 'current';
    if (branch.is_remote) return 'remote';
    if (branch.protection_rules?.require_pull_request) return 'protected';
    if (branch.ahead && branch.ahead > 0) return 'ahead';
    if (branch.behind && branch.behind > 0) return 'behind';
    return 'normal';
  };

  const localBranches = branches.filter(b => !b.is_remote);
  const remoteBranches = branches.filter(b => b.is_remote);

  return (
    <div className="branch-manager-container">
      {/* Header */}
      <div className="branch-header">
        <div className="branch-title-section">
          <button className="branch-back-btn" onClick={() => onNavigate("dashboard")}>
            ← Dashboard
          </button>
          <div className="branch-title-info">
            <div className="branch-title">Gerenciamento de Branches</div>
            <div className="branch-subtitle">
              <span>🌿 {repository.name}</span>
              <span>•</span>
              <span>{localBranches.length} locais • {remoteBranches.length} remotas</span>
            </div>
          </div>
        </div>

        <div className="branch-actions">
          <div className="view-controls">
            <div className="view-mode-selector">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Visualização em grade"
              >
                ⚏
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Visualização em lista"
              >
                ☰
              </button>
              <button 
                className={`view-btn ${viewMode === 'tree' ? 'active' : ''}`}
                onClick={() => setViewMode('tree')}
                title="Visualização em árvore"
              >
                🌳
              </button>
            </div>

            <div className="filter-selector">
              <select 
                value={filterMode} 
                onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                className="filter-select"
              >
                <option value="all">Todas as branches</option>
                <option value="local">Apenas locais</option>
                <option value="remote">Apenas remotas</option>
                <option value="stale">Branches antigas</option>
              </select>
            </div>
          </div>

          <div className="branch-operations">
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              ➕ Nova Branch
            </button>
            
            {selectedBranches.length > 0 && (
              <button 
                className="btn btn-error"
                onClick={bulkDeleteBranches}
              >
                🗑️ Deletar ({selectedBranches.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-container-branch">
          <div className="search-icon">🔍</div>
          <input
            type="text"
            className="search-input-branch"
            placeholder="Buscar branches por nome, commit ou autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="search-clear"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="branch-main">
        {loading ? (
          <div className="loading-branches">
            <div className="loading-spinner"></div>
            <div>Carregando branches...</div>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="empty-branches">
            <div className="empty-icon">🌿</div>
            <div className="empty-title">
              {searchQuery ? 'Nenhuma branch encontrada' : 'Nenhuma branch disponível'}
            </div>
            <div className="empty-description">
              {searchQuery 
                ? 'Tente uma busca diferente ou ajuste os filtros'
                : 'Crie uma nova branch para começar a trabalhar'
              }
            </div>
            {!searchQuery && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                ➕ Criar primeira branch
              </button>
            )}
          </div>
        ) : (
          <div className={`branches-content ${viewMode}`}>
            {viewMode === 'grid' && (
              <div className="branches-grid">
                {filteredBranches.map((branch) => (
                  <div
                    key={branch.name}
                    className={`branch-card ${getStatusColor(branch)}`}
                  >
                    <div className="branch-card-header">
                      <div className="branch-card-main">
                        <div className="branch-icon">{getBranchIcon(branch)}</div>
                        <div className="branch-info">
                          <div className="branch-name">{branch.name}</div>
                          <div className="branch-meta">
                            {branch.last_commit_author} • {formatDate(branch.last_commit_date || 0)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="branch-card-actions">
                        <input
                          type="checkbox"
                          checked={selectedBranches.includes(branch.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBranches(prev => [...prev, branch.name]);
                            } else {
                              setSelectedBranches(prev => prev.filter(name => name !== branch.name));
                            }
                          }}
                          disabled={branch.is_head}
                        />
                      </div>
                    </div>

                    <div className="branch-card-commit">
                      {branch.last_commit_message}
                    </div>

                    <div className="branch-card-status">
                      {branch.ahead !== undefined && branch.ahead > 0 && (
                        <span className="status-badge ahead">↑{branch.ahead}</span>
                      )}
                      {branch.behind !== undefined && branch.behind > 0 && (
                        <span className="status-badge behind">↓{branch.behind}</span>
                      )}
                      {branch.protection_rules?.require_pull_request && (
                        <span className="status-badge protected">🛡️</span>
                      )}
                      {branch.is_head && (
                        <span className="status-badge current">ATUAL</span>
                      )}
                    </div>

                    <div className="branch-card-footer">
                      <div className="branch-operations">
                        {!branch.is_head && !branch.is_remote && (
                          <button
                            className="branch-op-btn switch"
                            onClick={() => switchToBranch(branch.name)}
                            title="Alternar para esta branch"
                          >
                            🔄
                          </button>
                        )}
                        
                        <button
                          className="branch-op-btn merge"
                          onClick={() => mergeBranch(branch.name, 'main')}
                          title="Fazer merge desta branch"
                        >
                          🔀
                        </button>
                        
                        {!branch.is_remote && (
                          <button
                            className="branch-op-btn protect"
                            onClick={() => {
                              setProtectionBranch(branch);
                              setShowProtectionModal(true);
                            }}
                            title="Configurar proteções"
                          >
                            🛡️
                          </button>
                        )}
                        
                        {!branch.is_head && !branch.is_remote && (
                          <button
                            className="branch-op-btn delete"
                            onClick={() => {
                              setBranchToDelete(branch);
                              setShowDeleteModal(true);
                            }}
                            title="Deletar branch"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="branches-list">
                <div className="list-header">
                  <div className="list-col name">Nome</div>
                  <div className="list-col commit">Último commit</div>
                  <div className="list-col author">Autor</div>
                  <div className="list-col date">Data</div>
                  <div className="list-col status">Status</div>
                  <div className="list-col actions">Ações</div>
                </div>
                
                {filteredBranches.map((branch) => (
                  <div
                    key={branch.name}
                    className={`list-row ${getStatusColor(branch)}`}
                  >
                    <div className="list-col name">
                      <input
                        type="checkbox"
                        checked={selectedBranches.includes(branch.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBranches(prev => [...prev, branch.name]);
                          } else {
                            setSelectedBranches(prev => prev.filter(name => name !== branch.name));
                          }
                        }}
                        disabled={branch.is_head}
                      />
                      <div className="branch-icon">{getBranchIcon(branch)}</div>
                      <span className="branch-name">{branch.name}</span>
                    </div>
                    
                    <div className="list-col commit">
                      {branch.last_commit_message}
                    </div>
                    
                    <div className="list-col author">
                      {branch.last_commit_author}
                    </div>
                    
                    <div className="list-col date">
                      {formatDate(branch.last_commit_date || 0)}
                    </div>
                    
                    <div className="list-col status">
                      {branch.ahead !== undefined && branch.ahead > 0 && (
                        <span className="status-badge ahead">↑{branch.ahead}</span>
                      )}
                      {branch.behind !== undefined && branch.behind > 0 && (
                        <span className="status-badge behind">↓{branch.behind}</span>
                      )}
                      {branch.protection_rules?.require_pull_request && (
                        <span className="status-badge protected">🛡️</span>
                      )}
                      {branch.is_head && (
                        <span className="status-badge current">ATUAL</span>
                      )}
                    </div>
                    
                    <div className="list-col actions">
                      <div className="branch-operations">
                        {!branch.is_head && !branch.is_remote && (
                          <button
                            className="branch-op-btn switch"
                            onClick={() => switchToBranch(branch.name)}
                            title="Alternar para esta branch"
                          >
                            🔄
                          </button>
                        )}
                        
                        <button
                          className="branch-op-btn merge"
                          onClick={() => mergeBranch(branch.name, 'main')}
                          title="Fazer merge desta branch"
                        >
                          🔀
                        </button>
                        
                        {!branch.is_remote && (
                          <button
                            className="branch-op-btn protect"
                            onClick={() => {
                              setProtectionBranch(branch);
                              setShowProtectionModal(true);
                            }}
                            title="Configurar proteções"
                          >
                            🛡️
                          </button>
                        )}
                        
                        {!branch.is_head && !branch.is_remote && (
                          <button
                            className="branch-op-btn delete"
                            onClick={() => {
                              setBranchToDelete(branch);
                              setShowDeleteModal(true);
                            }}
                            title="Deletar branch"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'tree' && (
              <div className="branches-tree">
                <div className="tree-section">
                  <div className="tree-title">📍 Branches Locais</div>
                  {filteredBranches.filter(b => !b.is_remote).map((branch, index, arr) => (
                    <div key={branch.name} className={`tree-node ${getStatusColor(branch)}`}>
                      <div className="tree-connector">
                        {index === arr.length - 1 ? '└─' : '├─'}
                      </div>
                      <div className="tree-content">
                        <div className="branch-icon">{getBranchIcon(branch)}</div>
                        <div className="branch-info">
                          <div className="branch-name">{branch.name}</div>
                          <div className="branch-details">
                            {branch.last_commit_message} • {branch.last_commit_author} • {formatDate(branch.last_commit_date || 0)}
                          </div>
                        </div>
                        <div className="branch-status">
                          {branch.ahead !== undefined && branch.ahead > 0 && (
                            <span className="status-badge ahead">↑{branch.ahead}</span>
                          )}
                          {branch.behind !== undefined && branch.behind > 0 && (
                            <span className="status-badge behind">↓{branch.behind}</span>
                          )}
                          {branch.protection_rules?.require_pull_request && (
                            <span className="status-badge protected">🛡️</span>
                          )}
                          {branch.is_head && (
                            <span className="status-badge current">ATUAL</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="tree-section">
                  <div className="tree-title">🌐 Branches Remotas</div>
                  {filteredBranches.filter(b => b.is_remote).map((branch, index, arr) => (
                    <div key={branch.name} className={`tree-node ${getStatusColor(branch)}`}>
                      <div className="tree-connector">
                        {index === arr.length - 1 ? '└─' : '├─'}
                      </div>
                      <div className="tree-content">
                        <div className="branch-icon">{getBranchIcon(branch)}</div>
                        <div className="branch-info">
                          <div className="branch-name">{branch.name}</div>
                          <div className="branch-details">
                            {branch.last_commit_message} • {branch.last_commit_author} • {formatDate(branch.last_commit_date || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Branch Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">➕ Criar Nova Branch</div>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Nome da branch</label>
                <input
                  type="text"
                  className="input"
                  placeholder="feature/nova-funcionalidade"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="form-group">
                <label>Branch de origem</label>
                <select
                  className="form-select"
                  value={newBranchSource}
                  onChange={(e) => setNewBranchSource(e.target.value)}
                >
                  <option value="">Branch atual</option>
                  {localBranches.map(branch => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name} {branch.is_head ? '(atual)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={createBranch}
                disabled={!newBranchName.trim()}
              >
                Criar Branch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Branch Modal */}
      {showDeleteModal && branchToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">🗑️ Deletar Branch</div>
              <button 
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="delete-warning">
                <div className="warning-icon">⚠️</div>
                <div className="warning-text">
                  <div>Tem certeza que deseja deletar a branch:</div>
                  <div className="branch-to-delete">{branchToDelete.name}</div>
                  <div>Esta ação não pode ser desfeita.</div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-error"
                onClick={() => deleteBranch(branchToDelete)}
              >
                Deletar Branch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Protection Rules Modal */}
      {showProtectionModal && protectionBranch && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <div className="modal-title">🛡️ Regras de Proteção</div>
              <button 
                className="modal-close"
                onClick={() => setShowProtectionModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="protection-branch">
                Branch: <strong>{protectionBranch.name}</strong>
              </div>
              
              <div className="protection-rules">
                <div className="rule-group">
                  <label className="rule-label">
                    <input
                      type="checkbox"
                      checked={protectionBranch.protection_rules?.prevent_force_push || false}
                      onChange={(e) => {
                        const newRules = {
                          ...protectionBranch.protection_rules,
                          prevent_force_push: e.target.checked
                        } as BranchProtection;
                        setProtectionBranch({
                          ...protectionBranch,
                          protection_rules: newRules
                        });
                      }}
                    />
                    Prevenir force push
                  </label>
                  <div className="rule-description">
                    Impede que commits sejam forçados nesta branch
                  </div>
                </div>
                
                <div className="rule-group">
                  <label className="rule-label">
                    <input
                      type="checkbox"
                      checked={protectionBranch.protection_rules?.require_pull_request || false}
                      onChange={(e) => {
                        const newRules = {
                          ...protectionBranch.protection_rules,
                          require_pull_request: e.target.checked
                        } as BranchProtection;
                        setProtectionBranch({
                          ...protectionBranch,
                          protection_rules: newRules
                        });
                      }}
                    />
                    Exigir pull request
                  </label>
                  <div className="rule-description">
                    Mudanças devem ser feitas via pull request
                  </div>
                </div>
                
                <div className="rule-group">
                  <label className="rule-label">
                    <input
                      type="checkbox"
                      checked={protectionBranch.protection_rules?.require_review || false}
                      onChange={(e) => {
                        const newRules = {
                          ...protectionBranch.protection_rules,
                          require_review: e.target.checked
                        } as BranchProtection;
                        setProtectionBranch({
                          ...protectionBranch,
                          protection_rules: newRules
                        });
                      }}
                    />
                    Exigir revisão
                  </label>
                  <div className="rule-description">
                    Pull requests devem ser revisados antes do merge
                  </div>
                </div>
                
                <div className="rule-group">
                  <label className="rule-label">
                    <input
                      type="checkbox"
                      checked={protectionBranch.protection_rules?.dismiss_stale_reviews || false}
                      onChange={(e) => {
                        const newRules = {
                          ...protectionBranch.protection_rules,
                          dismiss_stale_reviews: e.target.checked
                        } as BranchProtection;
                        setProtectionBranch({
                          ...protectionBranch,
                          protection_rules: newRules
                        });
                      }}
                    />
                    Dispensar revisões antigas
                  </label>
                  <div className="rule-description">
                    Revisões são invalidadas quando novos commits são adicionados
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowProtectionModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => updateProtectionRules(protectionBranch.name, protectionBranch.protection_rules!)}
              >
                Salvar Regras
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManager;