import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import "./Dashboard.css";

interface RepositoryInfo {
  name: string;
  path: string;
  current_branch: string;
  last_commit: string;
  is_dirty: boolean;
  last_accessed: number;
}

interface DashboardProps {
  onRepositorySelect: (repo: RepositoryInfo) => void;
  onNavigate: (screen: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onRepositorySelect, onNavigate }) => {
  const [repositories, setRepositories] = useState<RepositoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<RepositoryInfo | null>(null);
  const [favoriteRepos, setFavoriteRepos] = useState<string[]>([]);

  // Carregar repositórios
  useEffect(() => {
    loadRepositories();
    loadFavorites();
  }, []);

  const loadRepositories = async () => {
    try {
      setLoading(true);
      const repos = await invoke<RepositoryInfo[]>("discover_repositories");
      setRepositories(repos);
    } catch (error) {
      console.error("Failed to load repositories:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem("codegit-favorites");
    if (saved) {
      setFavoriteRepos(JSON.parse(saved));
    }
  };

  const toggleFavorite = (repoPath: string) => {
    const newFavorites = favoriteRepos.includes(repoPath)
      ? favoriteRepos.filter(path => path !== repoPath)
      : [...favoriteRepos, repoPath];
    
    setFavoriteRepos(newFavorites);
    localStorage.setItem("codegit-favorites", JSON.stringify(newFavorites));
  };

  // Repositórios filtrados
  const filteredRepositories = useMemo(() => {
    return repositories.filter(repo =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.current_branch.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [repositories, searchQuery]);

  // Repositórios favoritos
  const favoriteRepositories = useMemo(() => {
    return repositories.filter(repo => favoriteRepos.includes(repo.path));
  }, [repositories, favoriteRepos]);

  // Repositórios recentes (últimos 6)
  const recentRepositories = useMemo(() => {
    return [...filteredRepositories]
      .sort((a, b) => b.last_accessed - a.last_accessed)
      .slice(0, 6);
  }, [filteredRepositories]);

  const openRepository = async () => {
    try {
      const selected = await open({
        directory: true,
        title: "Select Git Repository"
      });
      
      if (selected && typeof selected === "string") {
        // Verificar se é um repositório Git válido
        // Adicionar à lista se válido
        loadRepositories();
      }
    } catch (error) {
      console.error("Failed to open repository:", error);
    }
  };

  const cloneRepository = () => {
    // Implementar modal de clone
    console.log("Clone repository modal");
  };

  const handleRepositoryClick = (repo: RepositoryInfo) => {
    setSelectedRepo(repo);
    onRepositorySelect(repo);
    onNavigate("commits");
  };

  const getStatusColor = (repo: RepositoryInfo) => {
    if (repo.is_dirty) return "dirty";
    return "clean";
  };

  const getStatusDot = (repo: RepositoryInfo) => {
    if (repo.is_dirty) return "dirty";
    return "clean";
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Agora mesmo";
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d atrás`;
    return date.toLocaleDateString();
  };

  const truncateCommit = (commit: string, maxLength: number = 60) => {
    if (commit.length <= maxLength) return commit;
    return commit.substring(0, maxLength) + "...";
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar Esquerda */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">⚡</div>
            CodeGit
          </div>
        </div>

        <div className="search-container">
          <div className="search-icon">🔍</div>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar repositórios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="favorites-section">
          <div className="section-title">Favoritos</div>
          {favoriteRepositories.length === 0 ? (
            <div style={{ 
              padding: "20px 16px", 
              textAlign: "center", 
              color: "#64748b", 
              fontSize: "13px" 
            }}>
              Nenhum favorito ainda
            </div>
          ) : (
            favoriteRepositories.map((repo) => (
              <div
                key={repo.path}
                className={`favorite-repo ${selectedRepo?.path === repo.path ? 'active' : ''}`}
                onClick={() => handleRepositoryClick(repo)}
                title={repo.path}
              >
                <div className={`repo-status-dot ${getStatusDot(repo)}`}></div>
                <div className="repo-info">
                  <div className="repo-name">{repo.name}</div>
                  <div className="repo-branch">{repo.current_branch}</div>
                </div>
              </div>
            ))
          )}

          <div className="section-title" style={{marginTop: "30px"}}>Todos os Repositórios</div>
          {repositories.slice(0, 10).map((repo) => (
            <div
              key={repo.path}
              className={`favorite-repo ${selectedRepo?.path === repo.path ? 'active' : ''}`}
              onClick={() => handleRepositoryClick(repo)}
              title={repo.path}
            >
              <div className={`repo-status-dot ${getStatusDot(repo)}`}></div>
              <div className="repo-info">
                <div className="repo-name">{repo.name}</div>
                <div className="repo-branch">{repo.current_branch}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área Principal */}
      <div className="main-content">
        <div className="main-header">
          <div className="header-title">
            {searchQuery ? `Resultados para "${searchQuery}"` : "Repositórios Recentes"}
          </div>
          <div className="header-actions">
            <button className="action-btn" onClick={cloneRepository}>
              📋 Clonar
            </button>
            <button className="action-btn" onClick={openRepository}>
              📂 Abrir Local
            </button>
            <button className="action-btn primary" onClick={loadRepositories}>
              🔄 Atualizar
            </button>
          </div>
        </div>

        <div className="repos-grid">
          {loading ? (
            <div className="loading">
              Carregando repositórios...
            </div>
          ) : filteredRepositories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <div className="empty-title">
                {searchQuery ? "Nenhum repositório encontrado" : "Nenhum repositório"}
              </div>
              <div className="empty-description">
                {searchQuery 
                  ? "Tente uma busca diferente ou adicione novos repositórios"
                  : "Abra um repositório local ou clone um repositório remoto para começar"
                }
              </div>
              {!searchQuery && (
                <div style={{display: "flex", gap: "12px"}}>
                  <button className="action-btn primary" onClick={openRepository}>
                    📂 Abrir Local
                  </button>
                  <button className="action-btn" onClick={cloneRepository}>
                    📋 Clonar Remoto
                  </button>
                </div>
              )}
            </div>
          ) : (
            (searchQuery ? filteredRepositories : recentRepositories).map((repo) => (
              <div
                key={repo.path}
                className="repo-card"
                onClick={() => handleRepositoryClick(repo)}
              >
                <div className="repo-card-header">
                  <div>
                    <div className="repo-card-name">{repo.name}</div>
                    <div className="repo-card-path">{repo.path}</div>
                  </div>
                  <div className={`repo-card-status ${getStatusColor(repo)}`}>
                    {repo.is_dirty ? "📝 Modificado" : "✅ Limpo"}
                  </div>
                </div>

                <div className="repo-card-branch">
                  <div className="branch-icon">🌿</div>
                  <div className="branch-name">{repo.current_branch}</div>
                </div>

                <div className="repo-card-commit">
                  {truncateCommit(repo.last_commit)}
                </div>

                <div className="repo-card-footer">
                  <div className="repo-card-date">
                    {formatDate(repo.last_accessed)}
                  </div>
                  <div className="repo-card-actions">
                    <button
                      className="card-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(repo.path);
                      }}
                    >
                      {favoriteRepos.includes(repo.path) ? "⭐" : "☆"}
                    </button>
                    <button
                      className="card-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate("commits");
                        handleRepositoryClick(repo);
                      }}
                    >
                      📊 Histórico
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;