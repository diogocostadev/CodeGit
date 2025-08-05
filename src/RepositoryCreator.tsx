import { useState, useEffect } from "react";
import "./RepositoryCreator.css";
import "./design-system.css";

interface RepositoryCreatorProps {
  onNavigate: (screen: string) => void;
  onRepositoryCreated: (repo: any) => void;
}

interface GitHubAuth {
  isAuthenticated: boolean;
  username: string;
  avatar_url: string;
  access_token: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  language: string;
  files: {
    gitignore?: string;
    readme?: string;
    license?: string;
  };
}

interface RepositoryConfig {
  name: string;
  description: string;
  path: string;
  is_private: boolean;
  init_readme: boolean;
  gitignore_template: string;
  license_template: string;
  default_branch: string;
  create_on_github: boolean;
}

const RepositoryCreator: React.FC<RepositoryCreatorProps> = ({ onNavigate, onRepositoryCreated }) => {
  const [activeTab, setActiveTab] = useState<string>('new');
  const [githubAuth, setGithubAuth] = useState<GitHubAuth>({
    isAuthenticated: false,
    username: '',
    avatar_url: '',
    access_token: ''
  });
  const [repoConfig, setRepoConfig] = useState<RepositoryConfig>({
    name: '',
    description: '',
    path: '',
    is_private: false,
    init_readme: true,
    gitignore_template: 'none',
    license_template: 'none',
    default_branch: 'main',
    create_on_github: false
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneTarget, setCloneTarget] = useState('');
  const [initPath, setInitPath] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    loadTemplates();
    checkGitHubAuth();
  }, []);

  const loadTemplates = async () => {
    try {
      // Simular carregamento de templates
      const mockTemplates: Template[] = [
        {
          id: 'react-typescript',
          name: 'React + TypeScript',
          description: 'Aplicação React moderna com TypeScript e Vite',
          language: 'TypeScript',
          files: {
            gitignore: 'node',
            readme: 'react-ts',
            license: 'MIT'
          }
        },
        {
          id: 'node-api',
          name: 'Node.js API',
          description: 'API REST com Node.js, Express e TypeScript',
          language: 'JavaScript',
          files: {
            gitignore: 'node',
            readme: 'node-api',
            license: 'MIT'
          }
        },
        {
          id: 'python-flask',
          name: 'Python Flask',
          description: 'API web com Flask e estrutura de projeto completa',
          language: 'Python',
          files: {
            gitignore: 'python',
            readme: 'python-flask',
            license: 'MIT'
          }
        },
        {
          id: 'nextjs',
          name: 'Next.js Full-Stack',
          description: 'Aplicação full-stack com Next.js e TypeScript',
          language: 'TypeScript',
          files: {
            gitignore: 'nextjs',
            readme: 'nextjs',
            license: 'MIT'
          }
        },
        {
          id: 'rust-cli',
          name: 'Rust CLI',
          description: 'Aplicação de linha de comando em Rust',
          language: 'Rust',
          files: {
            gitignore: 'rust',
            readme: 'rust-cli',
            license: 'Apache-2.0'
          }
        },
        {
          id: 'go-microservice',
          name: 'Go Microservice',
          description: 'Microserviço em Go com Docker e testes',
          language: 'Go',
          files: {
            gitignore: 'go',
            readme: 'go-microservice',
            license: 'MIT'
          }
        }
      ];
      setTemplates(mockTemplates);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  const checkGitHubAuth = async () => {
    try {
      // Simular verificação de autenticação
      // Na implementação real, seria uma chamada para verificar token salvo
      const mockAuth: GitHubAuth = {
        isAuthenticated: false, // Começar não autenticado
        username: '',
        avatar_url: '',
        access_token: ''
      };
      setGithubAuth(mockAuth);
    } catch (error) {
      console.error("Failed to check GitHub auth:", error);
    }
  };

  const authenticateGitHub = async () => {
    try {
      setLoading(true);
      
      // Simular autenticação OAuth com GitHub
      console.log("Starting GitHub OAuth flow...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock de dados de usuário autenticado
      const mockAuth: GitHubAuth = {
        isAuthenticated: true,
        username: 'johndoe',
        avatar_url: 'https://github.com/johndoe.png',
        access_token: 'mock_access_token_123'
      };
      
      setGithubAuth(mockAuth);
    } catch (error) {
      console.error("Failed to authenticate with GitHub:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectDirectory = async () => {
    try {
      // Simular seleção de diretório
      const mockPath = '/Users/johndoe/Projetos/' + (repoConfig.name || 'novo-repositorio');
      setRepoConfig({...repoConfig, path: mockPath});
    } catch (error) {
      console.error("Failed to select directory:", error);
    }
  };

  const createRepository = async () => {
    if (!repoConfig.name.trim()) return;

    try {
      setCreating(true);
      setStep(1);

      // Passo 1: Criar estrutura local
      console.log("Step 1: Creating local repository structure...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep(2);

      // Passo 2: Inicializar Git
      console.log("Step 2: Initializing Git repository...");
      await new Promise(resolve => setTimeout(resolve, 800));
      setStep(3);

      // Passo 3: Aplicar template (se selecionado)
      if (selectedTemplate) {
        console.log("Step 3: Applying template files...");
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
      setStep(4);

      // Passo 4: Criar no GitHub (se solicitado)
      if (repoConfig.create_on_github && githubAuth.isAuthenticated) {
        console.log("Step 4: Creating repository on GitHub...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStep(5);

        // Passo 5: Push inicial
        console.log("Step 5: Pushing initial commit...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Simular repositório criado
      const newRepo = {
        name: repoConfig.name,
        path: repoConfig.path,
        current_branch: repoConfig.default_branch,
        last_commit: 'Initial commit',
        is_dirty: false,
        last_accessed: Date.now() / 1000
      };

      onRepositoryCreated(newRepo);
      onNavigate('dashboard');

    } catch (error) {
      console.error("Failed to create repository:", error);
    } finally {
      setCreating(false);
      setStep(1);
    }
  };

  const cloneRepository = async () => {
    if (!cloneUrl.trim() || !cloneTarget.trim()) return;

    try {
      setCreating(true);
      setStep(1);

      console.log("Step 1: Validating repository URL...");
      await new Promise(resolve => setTimeout(resolve, 800));
      setStep(2);

      console.log("Step 2: Cloning repository...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStep(3);

      console.log("Step 3: Setting up local configuration...");
      await new Promise(resolve => setTimeout(resolve, 500));

      // Simular repositório clonado
      const repoName = cloneUrl.split('/').pop()?.replace('.git', '') || 'cloned-repo';
      const clonedRepo = {
        name: repoName,
        path: cloneTarget + '/' + repoName,
        current_branch: 'main',
        last_commit: 'Latest commit from origin',
        is_dirty: false,
        last_accessed: Date.now() / 1000
      };

      onRepositoryCreated(clonedRepo);
      onNavigate('dashboard');

    } catch (error) {
      console.error("Failed to clone repository:", error);
    } finally {
      setCreating(false);
      setStep(1);
    }
  };

  const initializeGit = async () => {
    if (!initPath.trim()) return;

    try {
      setCreating(true);
      setStep(1);

      console.log("Step 1: Checking directory...");
      await new Promise(resolve => setTimeout(resolve, 500));
      setStep(2);

      console.log("Step 2: Initializing Git repository...");
      await new Promise(resolve => setTimeout(resolve, 800));
      setStep(3);

      console.log("Step 3: Creating initial commit...");
      await new Promise(resolve => setTimeout(resolve, 600));

      // Simular inicialização
      const folderName = initPath.split('/').pop() || 'initialized-repo';
      const initializedRepo = {
        name: folderName,
        path: initPath,
        current_branch: 'main',
        last_commit: 'Initial commit',
        is_dirty: false,
        last_accessed: Date.now() / 1000
      };

      onRepositoryCreated(initializedRepo);
      onNavigate('dashboard');

    } catch (error) {
      console.error("Failed to initialize Git:", error);
    } finally {
      setCreating(false);
      setStep(1);
    }
  };

  const gitignoreOptions = [
    { value: 'none', label: 'Nenhum' },
    { value: 'node', label: 'Node.js' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'rust', label: 'Rust' },
    { value: 'go', label: 'Go' },
    { value: 'react', label: 'React' },
    { value: 'nextjs', label: 'Next.js' },
    { value: 'flutter', label: 'Flutter' },
    { value: 'unity', label: 'Unity' }
  ];

  const licenseOptions = [
    { value: 'none', label: 'Nenhuma' },
    { value: 'MIT', label: 'MIT License' },
    { value: 'Apache-2.0', label: 'Apache License 2.0' },
    { value: 'GPL-3.0', label: 'GNU GPL v3' },
    { value: 'BSD-3-Clause', label: 'BSD 3-Clause' },
    { value: 'ISC', label: 'ISC License' }
  ];

  const tabs = [
    { id: 'new', label: 'Novo Repositório', icon: '📁' },
    { id: 'clone', label: 'Clonar', icon: '📋' },
    { id: 'init', label: 'Inicializar Git', icon: '🔧' },
    { id: 'templates', label: 'Templates', icon: '🎨' }
  ];

  const renderProgressSteps = () => (
    <div className="progress-steps">
      <div className="steps-container">
        <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Preparando</div>
        </div>
        <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Git Init</div>
        </div>
        <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Template</div>
        </div>
        {repoConfig.create_on_github && (
          <>
            <div className={`step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>
              <div className="step-number">4</div>
              <div className="step-label">GitHub</div>
            </div>
            <div className={`step ${step >= 5 ? 'active' : ''} ${step > 5 ? 'completed' : ''}`}>
              <div className="step-number">5</div>
              <div className="step-label">Push</div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'new':
        return (
          <div className="tab-content">
            <div className="form-section">
              <div className="section-title">Informações Básicas</div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Nome do repositório *</label>
                  <input
                    type="text"
                    className="input"
                    value={repoConfig.name}
                    onChange={(e) => setRepoConfig({...repoConfig, name: e.target.value})}
                    placeholder="meu-projeto-incrivel"
                  />
                </div>
                <div className="form-group">
                  <label>Branch padrão</label>
                  <select
                    value={repoConfig.default_branch}
                    onChange={(e) => setRepoConfig({...repoConfig, default_branch: e.target.value})}
                  >
                    <option value="main">main</option>
                    <option value="master">master</option>
                    <option value="develop">develop</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  className="input"
                  value={repoConfig.description}
                  onChange={(e) => setRepoConfig({...repoConfig, description: e.target.value})}
                  placeholder="Descrição do seu projeto..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Local do repositório</label>
                <div className="path-input-container">
                  <input
                    type="text"
                    className="input"
                    value={repoConfig.path}
                    onChange={(e) => setRepoConfig({...repoConfig, path: e.target.value})}
                    placeholder="Caminho onde criar o repositório"
                    readOnly
                  />
                  <button className="btn btn-secondary btn-sm" onClick={selectDirectory}>
                    📂 Escolher
                  </button>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">Configurações Iniciais</div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>.gitignore</label>
                  <select
                    value={repoConfig.gitignore_template}
                    onChange={(e) => setRepoConfig({...repoConfig, gitignore_template: e.target.value})}
                  >
                    {gitignoreOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Licença</label>
                  <select
                    value={repoConfig.license_template}
                    onChange={(e) => setRepoConfig({...repoConfig, license_template: e.target.value})}
                  >
                    {licenseOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="toggle-group">
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={repoConfig.init_readme}
                    onChange={(e) => setRepoConfig({...repoConfig, init_readme: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Criar README.md
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={repoConfig.is_private}
                    onChange={(e) => setRepoConfig({...repoConfig, is_private: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Repositório privado
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">Integração GitHub</div>
              
              {!githubAuth.isAuthenticated ? (
                <div className="github-auth">
                  <div className="auth-info">
                    <div className="auth-icon">🔐</div>
                    <div className="auth-text">
                      <div className="auth-title">Conectar ao GitHub</div>
                      <div className="auth-description">
                        Faça login para criar repositórios diretamente no GitHub
                      </div>
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={authenticateGitHub}
                    disabled={loading}
                  >
                    {loading ? '🔄 Conectando...' : '🐙 Conectar GitHub'}
                  </button>
                </div>
              ) : (
                <div className="github-connected">
                  <div className="user-info">
                    <img src={githubAuth.avatar_url} alt="Avatar" className="user-avatar" />
                    <div className="user-details">
                      <div className="user-name">@{githubAuth.username}</div>
                      <div className="user-status">✅ Conectado</div>
                    </div>
                  </div>
                  
                  <label className="toggle-option">
                    <input
                      type="checkbox"
                      checked={repoConfig.create_on_github}
                      onChange={(e) => setRepoConfig({...repoConfig, create_on_github: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                    Criar repositório no GitHub
                  </label>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={createRepository}
                disabled={!repoConfig.name.trim() || !repoConfig.path.trim() || creating}
              >
                {creating ? '🔄 Criando...' : '📁 Criar Repositório'}
              </button>
            </div>
          </div>
        );

      case 'clone':
        return (
          <div className="tab-content">
            <div className="form-section">
              <div className="section-title">Clonar Repositório</div>
              
              <div className="form-group">
                <label>URL do repositório *</label>
                <input
                  type="text"
                  className="input"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  placeholder="https://github.com/usuario/repositorio.git"
                />
                <div className="input-help">
                  Suporta HTTPS, SSH e GitHub URLs
                </div>
              </div>

              <div className="form-group">
                <label>Pasta de destino *</label>
                <div className="path-input-container">
                  <input
                    type="text"
                    value={cloneTarget}
                    onChange={(e) => setCloneTarget(e.target.value)}
                    placeholder="Pasta onde clonar o repositório"
                  />
                  <button className="path-select-btn" onClick={() => setCloneTarget('/Users/johndoe/Projetos')}>
                    📂 Escolher
                  </button>
                </div>
              </div>

              <div className="clone-options">
                <div className="options-title">Opções de Clone</div>
                <div className="toggle-group">
                  <label className="toggle-option">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                    Recurse submodules
                  </label>
                  <label className="toggle-option">
                    <input type="checkbox" />
                    <span className="toggle-slider"></span>
                    Shallow clone (apenas último commit)
                  </label>
                  <label className="toggle-option">
                    <input type="checkbox" />
                    <span className="toggle-slider"></span>
                    Clone apenas branch específica
                  </label>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={cloneRepository}
                disabled={!cloneUrl.trim() || !cloneTarget.trim() || creating}
              >
                {creating ? '🔄 Clonando...' : '📋 Clonar Repositório'}
              </button>
            </div>
          </div>
        );

      case 'init':
        return (
          <div className="tab-content">
            <div className="form-section">
              <div className="section-title">Inicializar Git</div>
              <div className="section-description">
                Transforme uma pasta existente em um repositório Git
              </div>
              
              <div className="form-group">
                <label>Pasta do projeto *</label>
                <div className="path-input-container">
                  <input
                    type="text"
                    value={initPath}
                    onChange={(e) => setInitPath(e.target.value)}
                    placeholder="Caminho da pasta existente"
                  />
                  <button className="path-select-btn" onClick={() => setInitPath('/Users/johndoe/Projetos/projeto-existente')}>
                    📂 Escolher
                  </button>
                </div>
              </div>

              <div className="init-preview">
                <div className="preview-title">O que será feito:</div>
                <div className="preview-steps">
                  <div className="preview-step">
                    <span className="step-icon">1️⃣</span>
                    <span>Inicializar repositório Git (.git/)</span>
                  </div>
                  <div className="preview-step">
                    <span className="step-icon">2️⃣</span>
                    <span>Criar .gitignore básico</span>
                  </div>
                  <div className="preview-step">
                    <span className="step-icon">3️⃣</span>
                    <span>Fazer commit inicial com arquivos existentes</span>
                  </div>
                  <div className="preview-step">
                    <span className="step-icon">4️⃣</span>
                    <span>Configurar branch principal (main)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={initializeGit}
                disabled={!initPath.trim() || creating}
              >
                {creating ? '🔄 Inicializando...' : '🔧 Inicializar Git'}
              </button>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className="tab-content">
            <div className="templates-section">
              <div className="section-title">Templates de Projeto</div>
              <div className="section-description">
                Começe rapidamente com templates pré-configurados
              </div>
              
              <div className="templates-grid">
                {templates.map(template => (
                  <div 
                    key={template.id}
                    className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="template-header">
                      <div className="template-language">{template.language}</div>
                      <div className="template-name">{template.name}</div>
                    </div>
                    <div className="template-description">
                      {template.description}
                    </div>
                    <div className="template-includes">
                      <div className="includes-title">Inclui:</div>
                      <div className="includes-list">
                        {template.files.gitignore && <span className="include-item">📄 .gitignore</span>}
                        {template.files.readme && <span className="include-item">📖 README.md</span>}
                        {template.files.license && <span className="include-item">📜 LICENSE</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTemplate && (
                <div className="template-details">
                  <div className="details-title">
                    Template Selecionado: {selectedTemplate.name}
                  </div>
                  <div className="template-config">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Nome do projeto *</label>
                        <input
                          type="text"
                          value={repoConfig.name}
                          onChange={(e) => setRepoConfig({...repoConfig, name: e.target.value})}
                          placeholder={`meu-projeto-${selectedTemplate.language.toLowerCase()}`}
                        />
                      </div>
                      <div className="form-group">
                        <label>Local *</label>
                        <div className="path-input-container">
                          <input
                            type="text"
                            value={repoConfig.path}
                            onChange={(e) => setRepoConfig({...repoConfig, path: e.target.value})}
                            placeholder="Pasta de destino"
                            readOnly
                          />
                          <button className="path-select-btn" onClick={selectDirectory}>
                            📂 Escolher
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={createRepository}
                disabled={!selectedTemplate || !repoConfig.name.trim() || !repoConfig.path.trim() || creating}
              >
                {creating ? '🔄 Criando...' : '🎨 Criar com Template'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="repository-creator-container">
      {/* Header */}
      <div className="creator-header">
        <div className="creator-title-section">
          <button className="creator-back-btn" onClick={() => onNavigate("dashboard")}>
            ← Dashboard
          </button>
          <div className="creator-title-info">
            <div className="creator-title">Criação e Integração de Repositórios</div>
            <div className="creator-subtitle">
              <span>📁 CodeGit</span>
              <span>•</span>
              <span>Crie, clone ou inicialize repositórios Git</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="creator-main">
        {/* Sidebar */}
        <div className="creator-sidebar">
          <div className="tabs-list">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="creator-content">
          {creating && renderProgressSteps()}
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default RepositoryCreator;