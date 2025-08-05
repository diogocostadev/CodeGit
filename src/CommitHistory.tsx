import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./CommitHistory.css";

interface RepositoryInfo {
  name: string;
  path: string;
  current_branch: string;
  last_commit: string;
  is_dirty: boolean;
  last_accessed: number;
}

interface GitCommit {
  id: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
}

interface GitBranch {
  name: string;
  is_head: boolean;
  is_remote: boolean;
  target?: string;
}

interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

interface CommitHistoryProps {
  repository: RepositoryInfo;
  onNavigate: (screen: string) => void;
}

const CommitHistory: React.FC<CommitHistoryProps> = ({ repository, onNavigate }) => {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");

  useEffect(() => {
    if (repository) {
      loadCommitHistory();
      loadBranches();
    }
  }, [repository]);

  const loadCommitHistory = async () => {
    try {
      setLoading(true);
      const commitHistory = await invoke<GitCommit[]>("get_commits", {
        repoPath: repository.path
      });
      setCommits(commitHistory);
      if (commitHistory.length > 0) {
        setSelectedCommit(commitHistory[0]);
        loadFileChanges(commitHistory[0]);
      }
    } catch (error) {
      console.error("Failed to load commit history:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const branchList = await invoke<GitBranch[]>("get_branches", {
        repoPath: repository.path
      });
      setBranches(branchList);
    } catch (error) {
      console.error("Failed to load branches:", error);
    }
  };

  const loadFileChanges = async (_commit: GitCommit) => {
    try {
      // Simular carregamento de mudanças de arquivo
      // Na implementação real, seria uma chamada para o backend
      const mockChanges: FileChange[] = [
        { path: "src/components/Button.tsx", status: "modified", additions: 15, deletions: 3 },
        { path: "src/styles/global.css", status: "modified", additions: 8, deletions: 2 },
        { path: "tests/Button.test.ts", status: "added", additions: 45, deletions: 0 },
        { path: "README.md", status: "modified", additions: 2, deletions: 1 }
      ];
      setFileChanges(mockChanges);
    } catch (error) {
      console.error("Failed to load file changes:", error);
      setFileChanges([]);
    }
  };

  // Filtrar commits baseado na busca e filtros
  const filteredCommits = useMemo(() => {
    return commits.filter(commit => {
      const matchesSearch = searchQuery === "" || 
        commit.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        commit.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        commit.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAuthor = selectedAuthor === "all" || commit.author === selectedAuthor;
      
      // Filtro por branch seria implementado com informação adicional do backend
      const matchesBranch = selectedBranch === "all";

      return matchesSearch && matchesAuthor && matchesBranch;
    });
  }, [commits, searchQuery, selectedAuthor, selectedBranch]);

  // Lista de autores únicos para o filtro
  const uniqueAuthors = useMemo(() => {
    const authors = [...new Set(commits.map(commit => commit.author))];
    return authors.sort();
  }, [commits]);

  const handleCommitSelect = (commit: GitCommit) => {
    setSelectedCommit(commit);
    loadFileChanges(commit);
  };

  const handlePull = async () => {
    try {
      // Implementar pull
      console.log("Executing git pull...");
    } catch (error) {
      console.error("Pull failed:", error);
    }
  };

  const handlePush = async () => {
    try {
      // Implementar push
      console.log("Executing git push...");
    } catch (error) {
      console.error("Push failed:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Agora mesmo";
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d atrás`;
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCommitType = (message: string) => {
    if (message.toLowerCase().includes('merge')) return 'merge';
    if (message.toLowerCase().includes('hotfix')) return 'hotfix';
    if (message.toLowerCase().includes('feat') || message.toLowerCase().includes('feature')) return 'feature';
    return 'main';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const copyCommitHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    // Implementar toast de confirmação
    console.log("Commit hash copied:", hash);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added': return 'A';
      case 'modified': return 'M';
      case 'deleted': return 'D';
      default: return '?';
    }
  };

  return (
    <div className="commit-history-container">
      {/* Header com controles */}
      <div className="history-header">
        <div className="history-title">
          <button className="back-btn" onClick={() => onNavigate("dashboard")}>
            ← Voltar
          </button>
          <div className="repo-info">
            <div className="repo-name">{repository.name}</div>
            <div className="current-branch">
              🌿 {repository.current_branch}
            </div>
          </div>
        </div>

        <div className="history-controls">
          <div className="filter-group">
            <select 
              className="filter-select"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="all">Todas as Branches</option>
              {branches.map(branch => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>

            <select 
              className="filter-select"
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
            >
              <option value="all">Todos os Autores</option>
              {uniqueAuthors.map(author => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <div className="search-icon-commits">🔍</div>
            <input
              type="text"
              className="search-commits"
              placeholder="Buscar commits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="action-buttons">
            <button className="action-btn-history" onClick={handlePull}>
              ⬇️ Pull
            </button>
            <button className="action-btn-history primary" onClick={handlePush}>
              ⬆️ Push
            </button>
          </div>
        </div>
      </div>

      {/* Área principal */}
      <div className="history-main">
        {/* Gráfico de commits (lado esquerdo) */}
        <div className="commits-graph">
          <div className="graph-container">
            {loading ? (
              <div className="loading-commits">
                Carregando histórico de commits...
              </div>
            ) : filteredCommits.length === 0 ? (
              <div className="no-commits">
                <div className="no-commits-icon">📝</div>
                <div className="no-commits-title">
                  {searchQuery ? "Nenhum commit encontrado" : "Nenhum commit"}
                </div>
                <div className="no-commits-description">
                  {searchQuery 
                    ? "Tente uma busca diferente ou ajuste os filtros"
                    : "Este repositório não possui commits ainda"
                  }
                </div>
              </div>
            ) : (
              filteredCommits.map((commit, index) => (
                <div
                  key={commit.id}
                  className={`commit-row ${selectedCommit?.id === commit.id ? 'selected' : ''}`}
                  onClick={() => handleCommitSelect(commit)}
                >
                  <div className="commit-graph-visual">
                    <div className="commit-line vertical"></div>
                    <div className={`commit-dot ${getCommitType(commit.message)}`}></div>
                    {index < filteredCommits.length - 1 && (
                      <div className="commit-line vertical" style={{ top: '20px' }}></div>
                    )}
                  </div>

                  <div className="commit-info">
                    <div className="commit-message" title={commit.message}>
                      {commit.message}
                    </div>
                    <div className="commit-meta">
                      <div className="commit-author">
                        <div className="author-avatar" title={commit.author}>
                          {getInitials(commit.author)}
                        </div>
                        {commit.author}
                      </div>
                      <div className="commit-hash">{commit.id.slice(0, 7)}</div>
                      <div className="commit-date">{formatDate(commit.timestamp)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Painel de detalhes (lado direito) */}
        <div className="commit-details">
          {selectedCommit ? (
            <>
              <div className="details-header">
                <div className="details-title">Detalhes do Commit</div>
                <div className="details-commit-info">
                  <div className="details-row">
                    <div className="details-label">Autor:</div>
                    <div className="details-value">{selectedCommit.author}</div>
                  </div>
                  <div className="details-row">
                    <div className="details-label">Email:</div>
                    <div className="details-value">{selectedCommit.email}</div>
                  </div>
                  <div className="details-row">
                    <div className="details-label">Data:</div>
                    <div className="details-value">{formatDate(selectedCommit.timestamp)}</div>
                  </div>
                  <div className="details-row">
                    <div className="details-label">Hash:</div>
                    <div 
                      className="commit-hash-full"
                      onClick={() => copyCommitHash(selectedCommit.id)}
                      title="Clique para copiar"
                    >
                      {selectedCommit.id}
                    </div>
                  </div>
                </div>
              </div>

              <div className="files-section">
                <div className="files-title">
                  Arquivos Modificados
                  <div className="files-count">{fileChanges.length}</div>
                </div>
                
                <button 
                  onClick={() => onNavigate("diff")}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    color: '#60a5fa',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                    marginBottom: '16px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  📄 Ver Diff Completo
                </button>
                
                {fileChanges.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className={`file-status ${file.status}`}>
                      {getStatusIcon(file.status)}
                    </div>
                    <div className="file-path">{file.path}</div>
                    <div className="file-changes">
                      {file.additions > 0 && (
                        <span className="additions">+{file.additions}</span>
                      )}
                      {file.deletions > 0 && (
                        <span className="deletions">-{file.deletions}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">👆</div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#94a3b8' }}>
                Selecione um commit
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>
                Clique em um commit na lista para ver os detalhes
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controles de zoom */}
      <div className="zoom-controls">
        <button className="zoom-btn" title="Zoom In">
          +
        </button>
        <button className="zoom-btn" title="Zoom Out">
          -
        </button>
        <button className="zoom-btn" title="Ajustar à Tela">
          ⏹️
        </button>
      </div>
    </div>
  );
};

export default CommitHistory;