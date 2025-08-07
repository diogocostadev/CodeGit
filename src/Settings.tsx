import { useState, useEffect } from "react";
import { useAppState } from "./contexts/AppStateContext";
import "./Settings.css";

interface SettingsProps {
  onNavigate: (screen: string) => void;
}

interface GitConfig {
  user_name: string;
  user_email: string;
  default_branch: string;
  editor: string;
  diff_tool: string;
  merge_tool: string;
}

interface ThemeConfig {
  theme: 'dark' | 'light' | 'auto';
  accent_color: string;
  font_size: number;
  font_family: string;
  compact_mode: boolean;
  animations_enabled: boolean;
}

interface EditorConfig {
  tab_size: number;
  use_spaces: boolean;
  word_wrap: boolean;
  line_numbers: boolean;
  minimap_enabled: boolean;
  highlight_current_line: boolean;
}

interface SecurityConfig {
  remember_credentials: boolean;
  auto_fetch: boolean;
  verify_signatures: boolean;
  require_signed_commits: boolean;
  auto_prune: boolean;
}

interface NotificationConfig {
  enable_notifications: boolean;
  sound_enabled: boolean;
  show_on_commit: boolean;
  show_on_pull: boolean;
  show_on_push: boolean;
  show_on_conflict: boolean;
}

interface PerformanceConfig {
  max_commits_display: number;
  enable_file_cache: boolean;
  parallel_operations: boolean;
  auto_gc: boolean;
  cache_size_mb: number;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const { state } = useAppState();
  const [activeTab, setActiveTab] = useState<string>('git');
  const [gitConfig, setGitConfig] = useState<GitConfig>({
    user_name: state.user?.name || '',
    user_email: state.user?.email || '',
    default_branch: 'main',
    editor: 'code',
    diff_tool: 'vscode',
    merge_tool: 'vscode'
  });
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({
    theme: 'dark',
    accent_color: '#3b82f6',
    font_size: 14,
    font_family: 'Inter',
    compact_mode: false,
    animations_enabled: true
  });
  const [editorConfig, setEditorConfig] = useState<EditorConfig>({
    tab_size: 2,
    use_spaces: true,
    word_wrap: true,
    line_numbers: true,
    minimap_enabled: true,
    highlight_current_line: true
  });
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
    remember_credentials: true,
    auto_fetch: false,
    verify_signatures: false,
    require_signed_commits: false,
    auto_prune: true
  });
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    enable_notifications: true,
    sound_enabled: true,
    show_on_commit: true,
    show_on_pull: true,
    show_on_push: true,
    show_on_conflict: true
  });
  const [performanceConfig, setPerformanceConfig] = useState<PerformanceConfig>({
    max_commits_display: 500,
    enable_file_cache: true,
    parallel_operations: true,
    auto_gc: true,
    cache_size_mb: 256
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [state.user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Simular carregamento das configurações
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Carregar dados do usuário do contexto
      setGitConfig({
        user_name: state.user?.name || '',
        user_email: state.user?.email || '',
        default_branch: 'main',
        editor: 'code',
        diff_tool: 'vscode',
        merge_tool: 'vscode'
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Simular salvamento
      console.log("Saving settings:", {
        git: gitConfig,
        theme: themeConfig,
        editor: editorConfig,
        security: securityConfig,
        notifications: notificationConfig,
        performance: performanceConfig
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aplicar tema imediatamente
      applyTheme();
      
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = () => {
    document.documentElement.style.setProperty('--accent-color', themeConfig.accent_color);
    document.documentElement.style.setProperty('--font-size', `${themeConfig.font_size}px`);
    document.documentElement.style.setProperty('--font-family', themeConfig.font_family);
    
    if (themeConfig.theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

  const resetToDefaults = async () => {
    try {
      setSaving(true);
      
      setGitConfig({
        user_name: '',
        user_email: '',
        default_branch: 'main',
        editor: 'code',
        diff_tool: 'vscode',
        merge_tool: 'vscode'
      });
      
      setThemeConfig({
        theme: 'dark',
        accent_color: '#3b82f6',
        font_size: 14,
        font_family: 'Inter',
        compact_mode: false,
        animations_enabled: true
      });
      
      setEditorConfig({
        tab_size: 2,
        use_spaces: true,
        word_wrap: true,
        line_numbers: true,
        minimap_enabled: true,
        highlight_current_line: true
      });
      
      setSecurityConfig({
        remember_credentials: true,
        auto_fetch: false,
        verify_signatures: false,
        require_signed_commits: false,
        auto_prune: true
      });
      
      setNotificationConfig({
        enable_notifications: true,
        sound_enabled: true,
        show_on_commit: true,
        show_on_pull: true,
        show_on_push: true,
        show_on_conflict: true
      });
      
      setPerformanceConfig({
        max_commits_display: 500,
        enable_file_cache: true,
        parallel_operations: true,
        auto_gc: true,
        cache_size_mb: 256
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setShowResetModal(false);
      
    } catch (error) {
      console.error("Failed to reset settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const exportSettings = () => {
    const allSettings = {
      git: gitConfig,
      theme: themeConfig,
      editor: editorConfig,
      security: securityConfig,
      notifications: notificationConfig,
      performance: performanceConfig,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(allSettings, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codegit-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      
      if (imported.git) setGitConfig(imported.git);
      if (imported.theme) setThemeConfig(imported.theme);
      if (imported.editor) setEditorConfig(imported.editor);
      if (imported.security) setSecurityConfig(imported.security);
      if (imported.notifications) setNotificationConfig(imported.notifications);
      if (imported.performance) setPerformanceConfig(imported.performance);
      
      console.log("Settings imported successfully");
    } catch (error) {
      console.error("Failed to import settings:", error);
    }
  };

  const tabs = [
    { id: 'git', label: 'Git', icon: '⚙️' },
    { id: 'theme', label: 'Aparência', icon: '🎨' },
    { id: 'editor', label: 'Editor', icon: '📝' },
    { id: 'security', label: 'Segurança', icon: '🛡️' },
    { id: 'notifications', label: 'Notificações', icon: '🔔' },
    { id: 'performance', label: 'Performance', icon: '⚡' }
  ];

  const accentColors = [
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Roxo', value: '#8b5cf6' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Laranja', value: '#f59e0b' },
    { name: 'Vermelho', value: '#ef4444' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'git':
        return (
          <div className="tab-content">
            <div className="section">
              <div className="section-title">Configuração do Git</div>
              <div className="section-description">
                Configure suas informações pessoais e ferramentas preferidas
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Nome do usuário</label>
                  <input
                    type="text"
                    value={gitConfig.user_name}
                    onChange={(e) => setGitConfig({...gitConfig, user_name: e.target.value})}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={gitConfig.user_email}
                    onChange={(e) => setGitConfig({...gitConfig, user_email: e.target.value})}
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Branch padrão</label>
                  <select
                    value={gitConfig.default_branch}
                    onChange={(e) => setGitConfig({...gitConfig, default_branch: e.target.value})}
                  >
                    <option value="main">main</option>
                    <option value="master">master</option>
                    <option value="develop">develop</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Editor padrão</label>
                  <select
                    value={gitConfig.editor}
                    onChange={(e) => setGitConfig({...gitConfig, editor: e.target.value})}
                  >
                    <option value="code">Visual Studio Code</option>
                    <option value="vim">Vim</option>
                    <option value="nano">Nano</option>
                    <option value="subl">Sublime Text</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Ferramenta de diff</label>
                  <select
                    value={gitConfig.diff_tool}
                    onChange={(e) => setGitConfig({...gitConfig, diff_tool: e.target.value})}
                  >
                    <option value="vscode">VS Code</option>
                    <option value="vimdiff">Vim Diff</option>
                    <option value="meld">Meld</option>
                    <option value="beyond-compare">Beyond Compare</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Ferramenta de merge</label>
                  <select
                    value={gitConfig.merge_tool}
                    onChange={(e) => setGitConfig({...gitConfig, merge_tool: e.target.value})}
                  >
                    <option value="vscode">VS Code</option>
                    <option value="vimdiff">Vim Diff</option>
                    <option value="meld">Meld</option>
                    <option value="beyond-compare">Beyond Compare</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'theme':
        return (
          <div className="tab-content">
            <div className="section">
              <div className="section-title">Tema e Aparência</div>
              <div className="section-description">
                Personalize a aparência da interface
              </div>
              
              <div className="form-group">
                <label>Tema</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      value="dark"
                      checked={themeConfig.theme === 'dark'}
                      onChange={(e) => setThemeConfig({...themeConfig, theme: e.target.value as 'dark'})}
                    />
                    🌙 Escuro
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      value="light"
                      checked={themeConfig.theme === 'light'}
                      onChange={(e) => setThemeConfig({...themeConfig, theme: e.target.value as 'light'})}
                    />
                    ☀️ Claro
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      value="auto"
                      checked={themeConfig.theme === 'auto'}
                      onChange={(e) => setThemeConfig({...themeConfig, theme: e.target.value as 'auto'})}
                    />
                    🔄 Automático
                  </label>
                </div>
              </div>
              
              <div className="form-group">
                <label>Cor de destaque</label>
                <div className="color-grid">
                  {accentColors.map((color) => (
                    <button
                      key={color.value}
                      className={`color-option ${themeConfig.accent_color === color.value ? 'active' : ''}`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setThemeConfig({...themeConfig, accent_color: color.value})}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Tamanho da fonte</label>
                  <div className="slider-container">
                    <input
                      type="range"
                      min="12"
                      max="18"
                      value={themeConfig.font_size}
                      onChange={(e) => setThemeConfig({...themeConfig, font_size: parseInt(e.target.value)})}
                    />
                    <span className="slider-value">{themeConfig.font_size}px</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Família da fonte</label>
                  <select
                    value={themeConfig.font_family}
                    onChange={(e) => setThemeConfig({...themeConfig, font_family: e.target.value})}
                  >
                    <option value="Inter">Inter</option>
                    <option value="SF Pro">SF Pro</option>
                    <option value="Roboto">Roboto</option>
                    <option value="JetBrains Mono">JetBrains Mono</option>
                  </select>
                </div>
              </div>
              
              <div className="toggle-group">
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={themeConfig.compact_mode}
                    onChange={(e) => setThemeConfig({...themeConfig, compact_mode: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Modo compacto
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={themeConfig.animations_enabled}
                    onChange={(e) => setThemeConfig({...themeConfig, animations_enabled: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Habilitar animações
                </label>
              </div>
            </div>
          </div>
        );

      case 'editor':
        return (
          <div className="tab-content">
            <div className="section">
              <div className="section-title">Configurações do Editor</div>
              <div className="section-description">
                Configure a experiência de edição de código
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Tamanho da tabulação</label>
                  <select
                    value={editorConfig.tab_size}
                    onChange={(e) => setEditorConfig({...editorConfig, tab_size: parseInt(e.target.value)})}
                  >
                    <option value={2}>2 espaços</option>
                    <option value={4}>4 espaços</option>
                    <option value={8}>8 espaços</option>
                  </select>
                </div>
              </div>
              
              <div className="toggle-group">
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={editorConfig.use_spaces}
                    onChange={(e) => setEditorConfig({...editorConfig, use_spaces: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Usar espaços em vez de tabs
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={editorConfig.word_wrap}
                    onChange={(e) => setEditorConfig({...editorConfig, word_wrap: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Quebra de linha automática
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={editorConfig.line_numbers}
                    onChange={(e) => setEditorConfig({...editorConfig, line_numbers: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Mostrar números das linhas
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={editorConfig.minimap_enabled}
                    onChange={(e) => setEditorConfig({...editorConfig, minimap_enabled: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Habilitar minimapa
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={editorConfig.highlight_current_line}
                    onChange={(e) => setEditorConfig({...editorConfig, highlight_current_line: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Destacar linha atual
                </label>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="tab-content">
            <div className="section">
              <div className="section-title">Configurações de Segurança</div>
              <div className="section-description">
                Configure opções de segurança e autenticação
              </div>
              
              <div className="toggle-group">
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={securityConfig.remember_credentials}
                    onChange={(e) => setSecurityConfig({...securityConfig, remember_credentials: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Lembrar credenciais
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={securityConfig.auto_fetch}
                    onChange={(e) => setSecurityConfig({...securityConfig, auto_fetch: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Fetch automático
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={securityConfig.verify_signatures}
                    onChange={(e) => setSecurityConfig({...securityConfig, verify_signatures: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Verificar assinaturas
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={securityConfig.require_signed_commits}
                    onChange={(e) => setSecurityConfig({...securityConfig, require_signed_commits: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Exigir commits assinados
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={securityConfig.auto_prune}
                    onChange={(e) => setSecurityConfig({...securityConfig, auto_prune: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Poda automática
                </label>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="tab-content">
            <div className="section">
              <div className="section-title">Notificações</div>
              <div className="section-description">
                Configure quando e como receber notificações
              </div>
              
              <div className="toggle-group">
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={notificationConfig.enable_notifications}
                    onChange={(e) => setNotificationConfig({...notificationConfig, enable_notifications: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Habilitar notificações
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={notificationConfig.sound_enabled}
                    onChange={(e) => setNotificationConfig({...notificationConfig, sound_enabled: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Sons de notificação
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={notificationConfig.show_on_commit}
                    onChange={(e) => setNotificationConfig({...notificationConfig, show_on_commit: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Notificar ao fazer commit
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={notificationConfig.show_on_pull}
                    onChange={(e) => setNotificationConfig({...notificationConfig, show_on_pull: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Notificar ao fazer pull
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={notificationConfig.show_on_push}
                    onChange={(e) => setNotificationConfig({...notificationConfig, show_on_push: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Notificar ao fazer push
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={notificationConfig.show_on_conflict}
                    onChange={(e) => setNotificationConfig({...notificationConfig, show_on_conflict: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Notificar em conflitos
                </label>
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="tab-content">
            <div className="section">
              <div className="section-title">Performance</div>
              <div className="section-description">
                Configure opções para melhorar a performance
              </div>
              
              <div className="form-group">
                <label>Máximo de commits para exibir</label>
                <div className="slider-container">
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={performanceConfig.max_commits_display}
                    onChange={(e) => setPerformanceConfig({...performanceConfig, max_commits_display: parseInt(e.target.value)})}
                  />
                  <span className="slider-value">{performanceConfig.max_commits_display}</span>
                </div>
              </div>
              
              <div className="form-group">
                <label>Tamanho do cache (MB)</label>
                <div className="slider-container">
                  <input
                    type="range"
                    min="64"
                    max="1024"
                    step="64"
                    value={performanceConfig.cache_size_mb}
                    onChange={(e) => setPerformanceConfig({...performanceConfig, cache_size_mb: parseInt(e.target.value)})}
                  />
                  <span className="slider-value">{performanceConfig.cache_size_mb}MB</span>
                </div>
              </div>
              
              <div className="toggle-group">
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={performanceConfig.enable_file_cache}
                    onChange={(e) => setPerformanceConfig({...performanceConfig, enable_file_cache: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Habilitar cache de arquivos
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={performanceConfig.parallel_operations}
                    onChange={(e) => setPerformanceConfig({...performanceConfig, parallel_operations: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Operações paralelas
                </label>
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={performanceConfig.auto_gc}
                    onChange={(e) => setPerformanceConfig({...performanceConfig, auto_gc: e.target.checked})}
                  />
                  <span className="toggle-slider"></span>
                  Limpeza automática (GC)
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-title-section">
          <button className="settings-back-btn" onClick={() => onNavigate("dashboard")}>
            ← Dashboard
          </button>
          <div className="settings-title-info">
            <div className="settings-title">Configurações e Personalização</div>
            <div className="settings-subtitle">
              <span>⚙️ CodeGit</span>
              <span>•</span>
              <span>Personalize sua experiência</span>
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <input
            type="file"
            accept=".json"
            onChange={importSettings}
            style={{ display: 'none' }}
            id="import-settings"
          />
          <button 
            className="settings-action-btn"
            onClick={() => document.getElementById('import-settings')?.click()}
          >
            📥 Importar
          </button>
          <button 
            className="settings-action-btn"
            onClick={exportSettings}
          >
            📤 Exportar
          </button>
          <button 
            className="settings-action-btn reset"
            onClick={() => setShowResetModal(true)}
          >
            🔄 Resetar
          </button>
          <button 
            className="settings-action-btn save"
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? '💾 Salvando...' : '💾 Salvar'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="settings-main">
        {/* Sidebar */}
        <div className="settings-sidebar">
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
        <div className="settings-content">
          {loading ? (
            <div className="loading-settings">
              <div className="loading-spinner"></div>
              <div>Carregando configurações...</div>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">🔄 Resetar Configurações</div>
              <button 
                className="modal-close"
                onClick={() => setShowResetModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="reset-warning">
                <div className="warning-icon">⚠️</div>
                <div className="warning-text">
                  <div>Esta ação irá resetar todas as configurações para os valores padrão.</div>
                  <div>Todas as personalizações serão perdidas.</div>
                  <div>Tem certeza que deseja continuar?</div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="modal-btn cancel"
                onClick={() => setShowResetModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="modal-btn reset"
                onClick={resetToDefaults}
                disabled={saving}
              >
                {saving ? 'Resetando...' : 'Resetar Tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;