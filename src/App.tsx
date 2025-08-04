import { useState } from "react";
import Dashboard from "./Dashboard";
import "./App.css";

// Interfaces principais
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

// Tipos de telas disponíveis
type Screen = 
  | "dashboard"
  | "commits" 
  | "diff"
  | "merge"
  | "conflicts"
  | "branches"
  | "settings"
  | "account";

const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");
  const [selectedRepository, setSelectedRepository] = useState<RepositoryInfo | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);

  const handleRepositorySelect = (repo: RepositoryInfo) => {
    setSelectedRepository(repo);
    // Carregar dados do repositório selecionado
    loadRepositoryData(repo);
  };

  const loadRepositoryData = async (repo: RepositoryInfo) => {
    try {
      // Carregar commits e branches quando um repo é selecionado
      // Estas chamadas serão implementadas conforme avançamos nas telas
      console.log("Loading data for repository:", repo.name);
    } catch (error) {
      console.error("Failed to load repository data:", error);
    }
  };

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  // Renderizar a tela atual
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case "dashboard":
        return (
          <Dashboard 
            onRepositorySelect={handleRepositorySelect}
            onNavigate={handleNavigate}
          />
        );

      case "commits":
        return (
          <div style={{ 
            height: "100vh", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            background: "#0a0b0d",
            color: "#e2e8f0",
            flexDirection: "column",
            gap: "20px"
          }}>
            <h2>🚧 TELA 2 - Histórico Gráfico</h2>
            <p>Em desenvolvimento...</p>
            <button 
              onClick={() => handleNavigate("dashboard")}
              style={{
                padding: "10px 20px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              ← Voltar ao Dashboard
            </button>
            {selectedRepository && (
              <div style={{ textAlign: "center", marginTop: "20px" }}>
                <p><strong>Repositório:</strong> {selectedRepository.name}</p>
                <p><strong>Branch:</strong> {selectedRepository.current_branch}</p>
                <p><strong>Path:</strong> {selectedRepository.path}</p>
              </div>
            )}
          </div>
        );

      case "diff":
        return (
          <div style={{ 
            height: "100vh", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            background: "#0a0b0d",
            color: "#e2e8f0",
            flexDirection: "column",
            gap: "20px"
          }}>
            <h2>🚧 TELA 3 - Diff Visual Avançado</h2>
            <p>Em desenvolvimento...</p>
            <button 
              onClick={() => handleNavigate("dashboard")}
              style={{
                padding: "10px 20px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              ← Voltar ao Dashboard
            </button>
          </div>
        );

      case "merge":
        return (
          <div style={{ 
            height: "100vh", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            background: "#0a0b0d",
            color: "#e2e8f0",
            flexDirection: "column",
            gap: "20px"
          }}>
            <h2>🚧 TELA 4 - Merge Interativo (Drag-and-Drop)</h2>
            <p>Em desenvolvimento...</p>
            <button 
              onClick={() => handleNavigate("dashboard")}
              style={{
                padding: "10px 20px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              ← Voltar ao Dashboard
            </button>
          </div>
        );

      case "conflicts":
        return (
          <div style={{ 
            height: "100vh", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            background: "#0a0b0d",
            color: "#e2e8f0",
            flexDirection: "column",
            gap: "20px"
          }}>
            <h2>🚧 TELA 5 - Resolução Visual de Conflitos</h2>
            <p>Em desenvolvimento...</p>
            <button 
              onClick={() => handleNavigate("dashboard")}
              style={{
                padding: "10px 20px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              ← Voltar ao Dashboard
            </button>
          </div>
        );

      case "branches":
        return (
          <div style={{ 
            height: "100vh", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            background: "#0a0b0d",
            color: "#e2e8f0",
            flexDirection: "column",
            gap: "20px"
          }}>
            <h2>🚧 TELA 6 - Gerenciamento de Branches</h2>
            <p>Em desenvolvimento...</p>
            <button 
              onClick={() => handleNavigate("dashboard")}
              style={{
                padding: "10px 20px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              ← Voltar ao Dashboard
            </button>
          </div>
        );

      case "settings":
        return (
          <div style={{ 
            height: "100vh", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            background: "#0a0b0d",
            color: "#e2e8f0",
            flexDirection: "column",
            gap: "20px"
          }}>
            <h2>🚧 TELA 7 - Configurações e Personalização</h2>
            <p>Em desenvolvimento...</p>
            <button 
              onClick={() => handleNavigate("dashboard")}
              style={{
                padding: "10px 20px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              ← Voltar ao Dashboard
            </button>
          </div>
        );

      case "account":
        return (
          <div style={{ 
            height: "100vh", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            background: "#0a0b0d",
            color: "#e2e8f0",
            flexDirection: "column",
            gap: "20px"
          }}>
            <h2>🚧 TELA 8 - Licenciamento e Conta</h2>
            <p>Em desenvolvimento...</p>
            <button 
              onClick={() => handleNavigate("dashboard")}
              style={{
                padding: "10px 20px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              ← Voltar ao Dashboard
            </button>
          </div>
        );

      default:
        return (
          <Dashboard 
            onRepositorySelect={handleRepositorySelect}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div className="app">
      {renderCurrentScreen()}
    </div>
  );
};

export default App;