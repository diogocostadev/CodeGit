import { useState } from "react";
import Dashboard from "./Dashboard";
import CommitHistory from "./CommitHistory";
import DiffViewer from "./DiffViewer";
import MergeInteractive from "./MergeInteractive";
import ConflictResolver from "./ConflictResolver";
import BranchManager from "./BranchManager";
import Settings from "./Settings";
import Account from "./Account";
import RepositoryCreator from "./RepositoryCreator";
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

// interface GitCommit {
//   id: string;
//   message: string;
//   author: string;
//   email: string;
//   timestamp: number;
// }

// interface GitBranch {
//   name: string;
//   is_head: boolean;
//   is_remote: boolean;
//   target?: string;
// }

// Tipos de telas disponíveis
type Screen = 
  | "dashboard"
  | "commits" 
  | "diff"
  | "merge"
  | "conflicts"
  | "branches"
  | "settings"
  | "account"
  | "creator";

const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");
  const [selectedRepository, setSelectedRepository] = useState<RepositoryInfo | null>(null);
  // const [commits, setCommits] = useState<GitCommit[]>([]);
  // const [branches, setBranches] = useState<GitBranch[]>([]);

  const handleRepositorySelect = (repo: RepositoryInfo) => {
    setSelectedRepository(repo);
    // Carregar dados do repositório selecionado
    loadRepositoryData(repo);
  };

  const handleRepositoryCreated = (repo: RepositoryInfo) => {
    setSelectedRepository(repo);
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

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
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
        return selectedRepository ? (
          <CommitHistory 
            repository={selectedRepository}
            onNavigate={handleNavigate}
          />
        ) : (
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
            <h2>⚠️ Nenhum repositório selecionado</h2>
            <p>Selecione um repositório no dashboard para visualizar o histórico</p>
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

      case "diff":
        return selectedRepository ? (
          <DiffViewer 
            repository={selectedRepository}
            onNavigate={handleNavigate}
          />
        ) : (
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
            <h2>⚠️ Nenhum repositório selecionado</h2>
            <p>Selecione um repositório no dashboard para visualizar as diferenças</p>
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
        return selectedRepository ? (
          <MergeInteractive 
            repository={selectedRepository}
            onNavigate={handleNavigate}
          />
        ) : (
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
            <h2>⚠️ Nenhum repositório selecionado</h2>
            <p>Selecione um repositório no dashboard para fazer merge interativo</p>
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
        return selectedRepository ? (
          <ConflictResolver 
            repository={selectedRepository}
            onNavigate={handleNavigate}
          />
        ) : (
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
            <h2>⚠️ Nenhum repositório selecionado</h2>
            <p>Selecione um repositório no dashboard para resolver conflitos</p>
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
        return selectedRepository ? (
          <BranchManager 
            repository={selectedRepository}
            onNavigate={handleNavigate}
          />
        ) : (
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
            <h2>⚠️ Nenhum repositório selecionado</h2>
            <p>Selecione um repositório no dashboard para gerenciar branches</p>
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
          <Settings 
            onNavigate={handleNavigate}
          />
        );

      case "account":
        return (
          <Account 
            onNavigate={handleNavigate}
          />
        );

      case "creator":
        return (
          <RepositoryCreator 
            onNavigate={handleNavigate}
            onRepositoryCreated={handleRepositoryCreated}
          />
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