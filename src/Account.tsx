import { useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/tauri';
import { useAppState } from './contexts/AppStateContext';
import "./Account.css";
import "./design-system.css";

interface AccountProps {
  onNavigate: (screen: string) => void;
}

interface UserProfile {
  name: string;
  email: string;
  username: string;
  avatar_url?: string;
  joined_date: string;
  plan: 'free' | 'pro' | 'enterprise';
  repositories_count: number;
  commits_count: number;
}

interface License {
  type: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'expired' | 'trial';
  expires_at?: string;
  started_at: string;
  features: string[];
  limits: {
    repositories: number;
    team_members: number;
    storage_gb: number;
  };
}

interface Usage {
  repositories_used: number;
  team_members_used: number;
  storage_used_gb: number;
  monthly_commits: number;
  last_sync: string;
}

const Account: React.FC<AccountProps> = ({ onNavigate }) => {
  const { state } = useAppState();
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    email: '',
    username: '',
    joined_date: '',
    plan: 'free',
    repositories_count: 0,
    commits_count: 0
  });
  const [license, setLicense] = useState<License>({
    type: 'free',
    status: 'active',
    started_at: '',
    features: [],
    limits: {
      repositories: 10,
      team_members: 1,
      storage_gb: 5
    }
  });
  const [usage, setUsage] = useState<Usage>({
    repositories_used: 0,
    team_members_used: 1,
    storage_used_gb: 0,
    monthly_commits: 0,
    last_sync: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadAccountData();
  }, []);

  // Recarregar dados quando o usuário ou workspace mudar
  useEffect(() => {
    if (state.user) {
      loadAccountData();
    }
  }, [state.user, state.active_workspace, state.workspaces]);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      
      // Carregar dados do usuário do estado da aplicação e banco de dados
      const user = state.user;
      if (!user) {
        console.warn('No user data available');
        return;
      }

      // Buscar informações adicionais do banco de dados
      const dbInfo = await invoke('get_database_info') as any;
      
      // Contar repositórios no workspace ativo
      const currentWorkspace = state.workspaces[state.active_workspace];
      const repositoriesCount = currentWorkspace ? Object.keys(currentWorkspace.repositories).length : 0;
      
      // Calcular data de entrada baseada no created_at do usuário
      const joinedDate = user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      // Gerar username baseado no nome se não existir
      const username = user.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') || 'user';

      setUserProfile({
        name: user.name,
        email: user.email,
        username: username,
        avatar_url: undefined, // Por enquanto sem avatar
        joined_date: joinedDate,
        plan: 'free', // Por padrão é free
        repositories_count: repositoriesCount,
        commits_count: 0 // TODO: Implementar contagem de commits se necessário
      });
      
      setLicense({
        type: 'free',
        status: 'active',
        started_at: joinedDate,
        features: [
          'Até 10 repositórios privados',
          'Interface moderna e responsiva',
          'Operações Git básicas',
          'Visualização de commits e branches',
          'Suporte básico'
        ],
        limits: {
          repositories: 10,
          team_members: 1,
          storage_gb: 5
        }
      });
      
      setUsage({
        repositories_used: repositoriesCount,
        team_members_used: 1,
        storage_used_gb: 0.1, // Estimativa básica
        monthly_commits: 0, // TODO: Implementar se necessário
        last_sync: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Failed to load account data:", error);
      
      // Fallback para dados básicos se falhar
      if (state.user) {
        setUserProfile({
          name: state.user.name,
          email: state.user.email,
          username: state.user.name.toLowerCase().replace(/\s+/g, ''),
          joined_date: new Date().toISOString().split('T')[0],
          plan: 'free',
          repositories_count: 0,
          commits_count: 0
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      
      // Construir objeto de usuário preservando dados existentes
      const userInfo = {
        id: state.user?.id || null,
        name: userProfile.name,
        email: userProfile.email,
        workspace_name: state.user?.workspace_name || `${userProfile.name}'s Workspace`,
        created_at: state.user?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Salvar no banco usando o comando Tauri existente
      await invoke('save_user_info', { user: userInfo });
      
      console.log("Profile saved successfully:", userInfo);
      
      // Recarregar dados após salvar
      await loadAccountData();
      
    } catch (error) {
      console.error("Failed to save profile:", error);
      // TODO: Mostrar mensagem de erro para o usuário
    } finally {
      setSaving(false);
    }
  };

  const upgradePlan = async (newPlan: 'pro' | 'enterprise') => {
    try {
      setSaving(true);
      
      console.log(`Upgrading to ${newPlan} plan`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular upgrade
      const newFeatures = newPlan === 'pro' ? [
        'Repositórios ilimitados',
        'Operações Git avançadas',
        'Merge visual interativo',
        'Resolução de conflitos assistida',
        'Themes e personalização',
        'Suporte prioritário',
        'Backup automático'
      ] : [
        'Todos os recursos Pro',
        'Gestão de equipes',
        'Controle de acesso avançado',
        'Auditoria e logs',
        'SSO e LDAP',
        'Suporte 24/7',
        'SLA garantido',
        'Deployment personalizado'
      ];
      
      const newLimits = newPlan === 'pro' ? {
        repositories: -1, // Ilimitado
        team_members: 10,
        storage_gb: 100
      } : {
        repositories: -1, // Ilimitado
        team_members: -1, // Ilimitado
        storage_gb: 1000
      };
      
      setLicense({
        ...license,
        type: newPlan,
        status: 'active',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        features: newFeatures,
        limits: newLimits
      });
      
      setUserProfile({
        ...userProfile,
        plan: newPlan
      });
      
      setShowUpgradeModal(false);
      
    } catch (error) {
      console.error("Failed to upgrade plan:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    try {
      setSaving(true);
      
      console.log("Deleting account...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular exclusão da conta
      setShowDeleteModal(false);
      onNavigate('dashboard');
      
    } catch (error) {
      console.error("Failed to delete account:", error);
    } finally {
      setSaving(false);
    }
  };

  const exportData = () => {
    const accountData = {
      profile: userProfile,
      license: license,
      usage: usage,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(accountData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codegit-account-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Ilimitado
    return Math.round((used / limit) * 100);
  };

  const getStatusColor = (status: License['status']) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'expired': return 'error';
      default: return 'neutral';
    }
  };

  const getStatusLabel = (status: License['status']) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'trial': return 'Teste';
      case 'expired': return 'Expirada';
      default: return 'Desconhecida';
    }
  };

  const getPlanColor = (plan: License['type']) => {
    switch (plan) {
      case 'free': return 'neutral';
      case 'pro': return 'primary';
      case 'enterprise': return 'premium';
      default: return 'neutral';
    }
  };

  const getPlanLabel = (plan: License['type']) => {
    switch (plan) {
      case 'free': return 'Gratuito';
      case 'pro': return 'Profissional';
      case 'enterprise': return 'Enterprise';
      default: return 'Desconhecido';
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: '👤' },
    { id: 'license', label: 'Licença', icon: '📋' },
    { id: 'usage', label: 'Uso', icon: '📊' },
    { id: 'billing', label: 'Faturamento', icon: '💳' }
  ];

  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      price: 'R$ 0',
      period: '/mês',
      description: 'Perfeito para uso pessoal',
      features: [
        'Até 10 repositórios privados',
        'Interface moderna',
        'Operações Git básicas',
        'Suporte básico'
      ],
      limits: {
        repositories: 10,
        team_members: 1,
        storage_gb: 5
      }
    },
    {
      id: 'pro',
      name: 'Profissional',
      price: 'R$ 29',
      period: '/mês',
      description: 'Para desenvolvedores profissionais',
      features: [
        'Repositórios ilimitados',
        'Operações Git avançadas',
        'Merge visual interativo',
        'Themes e personalização',
        'Suporte prioritário'
      ],
      limits: {
        repositories: -1,
        team_members: 10,
        storage_gb: 100
      },
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'R$ 99',
      period: '/mês',
      description: 'Para equipes e empresas',
      features: [
        'Todos os recursos Pro',
        'Gestão de equipes',
        'SSO e LDAP',
        'Auditoria completa',
        'Suporte 24/7'
      ],
      limits: {
        repositories: -1,
        team_members: -1,
        storage_gb: 1000
      }
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="tab-content">
            <div className="profile-section">
              <div className="profile-header">
                <div className="profile-avatar">
                  {userProfile.avatar_url ? (
                    <img src={userProfile.avatar_url} alt="Avatar" />
                  ) : (
                    <div className="avatar-placeholder">
                      {userProfile.name.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <div className="profile-info">
                  <div className="profile-name">{userProfile.name || 'Nome não definido'}</div>
                  <div className="profile-username">@{userProfile.username || 'username'}</div>
                  <div className="profile-plan">
                    <span className={`plan-badge ${getPlanColor(userProfile.plan)}`}>
                      {getPlanLabel(userProfile.plan)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="profile-stats">
                <div className="stat-item">
                  <div className="stat-value">{userProfile.repositories_count}</div>
                  <div className="stat-label">Repositórios</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{userProfile.commits_count}</div>
                  <div className="stat-label">Commits</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{formatDate(userProfile.joined_date)}</div>
                  <div className="stat-label">Membro desde</div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">Informações Pessoais</div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Nome completo</label>
                  <input
                    type="text"
                    className="input"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="form-group">
                  <label>Nome de usuário</label>
                  <input
                    type="text"
                    className="input"
                    value={userProfile.username}
                    onChange={(e) => setUserProfile({...userProfile, username: e.target.value})}
                    placeholder="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="input"
                  value={userProfile.email}
                  onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="form-actions">
                <button 
                  className="btn btn-primary"
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? '💾 Salvando...' : '💾 Salvar Perfil'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'license':
        return (
          <div className="tab-content">
            <div className="license-section">
              <div className="license-header">
                <div className="license-info">
                  <div className="license-title">
                    Licença {getPlanLabel(license.type)}
                  </div>
                  <div className="license-status">
                    <span className={`status-badge ${getStatusColor(license.status)}`}>
                      {getStatusLabel(license.status)}
                    </span>
                    {license.expires_at && (
                      <span className="license-expires">
                        Expira em {formatDate(license.expires_at)}
                      </span>
                    )}
                  </div>
                </div>
                {license.type === 'free' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    ⬆️ Upgrade
                  </button>
                )}
              </div>

              <div className="license-features">
                <div className="features-title">Recursos incluídos</div>
                <div className="features-list">
                  {license.features.map((feature, index) => (
                    <div key={index} className="feature-item">
                      <span className="feature-check">✅</span>
                      <span className="feature-text">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="license-limits">
                <div className="limits-title">Limites do plano</div>
                <div className="limits-grid">
                  <div className="limit-item">
                    <div className="limit-label">Repositórios</div>
                    <div className="limit-value">
                      {license.limits.repositories === -1 ? 'Ilimitado' : license.limits.repositories}
                    </div>
                  </div>
                  <div className="limit-item">
                    <div className="limit-label">Membros da equipe</div>
                    <div className="limit-value">
                      {license.limits.team_members === -1 ? 'Ilimitado' : license.limits.team_members}
                    </div>
                  </div>
                  <div className="limit-item">
                    <div className="limit-label">Armazenamento</div>
                    <div className="limit-value">
                      {license.limits.storage_gb === -1 ? 'Ilimitado' : `${license.limits.storage_gb} GB`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'usage':
        return (
          <div className="tab-content">
            <div className="usage-section">
              <div className="usage-header">
                <div className="usage-title">Uso atual</div>
                <div className="usage-sync">
                  Última sincronização: {new Date(usage.last_sync).toLocaleString('pt-BR')}
                </div>
              </div>

              <div className="usage-grid">
                <div className="usage-item">
                  <div className="usage-item-header">
                    <div className="usage-label">Repositórios</div>
                    <div className="usage-numbers">
                      {usage.repositories_used} / {license.limits.repositories === -1 ? '∞' : license.limits.repositories}
                    </div>
                  </div>
                  {license.limits.repositories !== -1 && (
                    <div className="usage-bar">
                      <div 
                        className="usage-progress"
                        style={{ width: `${getUsagePercentage(usage.repositories_used, license.limits.repositories)}%` }}
                      />
                    </div>
                  )}
                  <div className="usage-percentage">
                    {license.limits.repositories === -1 ? 'Ilimitado' : `${getUsagePercentage(usage.repositories_used, license.limits.repositories)}% usado`}
                  </div>
                </div>

                <div className="usage-item">
                  <div className="usage-item-header">
                    <div className="usage-label">Membros da equipe</div>
                    <div className="usage-numbers">
                      {usage.team_members_used} / {license.limits.team_members === -1 ? '∞' : license.limits.team_members}
                    </div>
                  </div>
                  {license.limits.team_members !== -1 && (
                    <div className="usage-bar">
                      <div 
                        className="usage-progress"
                        style={{ width: `${getUsagePercentage(usage.team_members_used, license.limits.team_members)}%` }}
                      />
                    </div>
                  )}
                  <div className="usage-percentage">
                    {license.limits.team_members === -1 ? 'Ilimitado' : `${getUsagePercentage(usage.team_members_used, license.limits.team_members)}% usado`}
                  </div>
                </div>

                <div className="usage-item">
                  <div className="usage-item-header">
                    <div className="usage-label">Armazenamento</div>
                    <div className="usage-numbers">
                      {usage.storage_used_gb.toFixed(1)} GB / {license.limits.storage_gb === -1 ? '∞' : `${license.limits.storage_gb} GB`}
                    </div>
                  </div>
                  {license.limits.storage_gb !== -1 && (
                    <div className="usage-bar">
                      <div 
                        className="usage-progress"
                        style={{ width: `${getUsagePercentage(usage.storage_used_gb, license.limits.storage_gb)}%` }}
                      />
                    </div>
                  )}
                  <div className="usage-percentage">
                    {license.limits.storage_gb === -1 ? 'Ilimitado' : `${getUsagePercentage(usage.storage_used_gb, license.limits.storage_gb)}% usado`}
                  </div>
                </div>

                <div className="usage-item">
                  <div className="usage-item-header">
                    <div className="usage-label">Commits este mês</div>
                    <div className="usage-numbers">{usage.monthly_commits}</div>
                  </div>
                  <div className="usage-stat">
                    <div className="stat-icon">📈</div>
                    <div className="stat-text">
                      {usage.monthly_commits > 50 ? 'Alta atividade' : 
                       usage.monthly_commits > 20 ? 'Atividade moderada' : 'Baixa atividade'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="tab-content">
            <div className="billing-section">
              <div className="current-plan">
                <div className="plan-header">
                  <div className="plan-info">
                    <div className="plan-name">Plano {getPlanLabel(license.type)}</div>
                    <div className="plan-price">
                      {license.type === 'free' ? 'Gratuito' :
                       license.type === 'pro' ? 'R$ 29/mês' : 'R$ 99/mês'}
                    </div>
                  </div>
                  {license.type !== 'enterprise' && (
                    <button 
                      className="change-plan-btn"
                      onClick={() => setShowUpgradeModal(true)}
                    >
                      Alterar Plano
                    </button>
                  )}
                </div>
              </div>

              <div className="plans-comparison">
                <div className="comparison-title">Compare os planos</div>
                <div className="plans-grid">
                  {plans.map((plan) => (
                    <div 
                      key={plan.id}
                      className={`plan-card ${plan.popular ? 'popular' : ''} ${license.type === plan.id ? 'current' : ''}`}
                    >
                      {plan.popular && (
                        <div className="plan-badge">Mais Popular</div>
                      )}
                      {license.type === plan.id && (
                        <div className="plan-current">Plano Atual</div>
                      )}
                      
                      <div className="plan-card-header">
                        <div className="plan-card-name">{plan.name}</div>
                        <div className="plan-card-price">
                          {plan.price}
                          <span className="plan-period">{plan.period}</span>
                        </div>
                        <div className="plan-card-description">{plan.description}</div>
                      </div>

                      <div className="plan-card-features">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="plan-feature">
                            <span className="feature-check">✅</span>
                            <span className="feature-text">{feature}</span>
                          </div>
                        ))}
                      </div>

                      <div className="plan-card-footer">
                        {license.type === plan.id ? (
                          <button className="plan-btn current" disabled>
                            Plano Atual
                          </button>
                        ) : (
                          <button 
                            className="plan-btn"
                            onClick={() => plan.id !== 'free' ? upgradePlan(plan.id as 'pro' | 'enterprise') : null}
                            disabled={saving}
                          >
                            {plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="account-container">
      {/* Header */}
      <div className="account-header">
        <div className="account-title-section">
          <button className="account-back-btn" onClick={() => onNavigate("dashboard")}>
            ← Dashboard
          </button>
          <div className="account-title-info">
            <div className="account-title">Licenciamento e Conta</div>
            <div className="account-subtitle">
              <span>👤 {userProfile.name || 'Usuário'}</span>
              <span>•</span>
              <span>Gerencie sua conta e licença</span>
            </div>
          </div>
        </div>

        <div className="account-actions">
          <button 
            className="btn btn-secondary"
            onClick={exportData}
          >
            📤 Exportar Dados
          </button>
          <button 
            className="btn btn-error"
            onClick={() => setShowDeleteModal(true)}
          >
            🗑️ Excluir Conta
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="account-main">
        {/* Sidebar */}
        <div className="account-sidebar">
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
        <div className="account-content">
          {loading ? (
            <div className="loading-account">
              <div className="loading-spinner"></div>
              <div>Carregando dados da conta...</div>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <div className="modal-title">⬆️ Upgrade de Plano</div>
              <button 
                className="modal-close"
                onClick={() => setShowUpgradeModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="upgrade-description">
                Escolha o plano que melhor se adequa às suas necessidades:
              </div>
              
              <div className="upgrade-plans">
                {plans.filter(p => p.id !== 'free').map((plan) => (
                  <div key={plan.id} className={`upgrade-plan ${plan.popular ? 'popular' : ''}`}>
                    {plan.popular && (
                      <div className="plan-badge">Recomendado</div>
                    )}
                    
                    <div className="upgrade-plan-header">
                      <div className="upgrade-plan-name">{plan.name}</div>
                      <div className="upgrade-plan-price">
                        {plan.price}
                        <span className="plan-period">{plan.period}</span>
                      </div>
                    </div>
                    
                    <div className="upgrade-plan-features">
                      {plan.features.slice(0, 4).map((feature, index) => (
                        <div key={index} className="upgrade-feature">
                          ✅ {feature}
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      className="upgrade-plan-btn"
                      onClick={() => upgradePlan(plan.id as 'pro' | 'enterprise')}
                      disabled={saving}
                    >
                      {saving ? 'Processando...' : `Escolher ${plan.name}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">🗑️ Excluir Conta</div>
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
                  <div><strong>Esta ação é irreversível!</strong></div>
                  <div>Ao excluir sua conta, você perderá:</div>
                  <ul>
                    <li>Todos os dados e configurações</li>
                    <li>Histórico de commits e repositórios</li>
                    <li>Licença atual e benefícios</li>
                    <li>Acesso a todos os recursos</li>
                  </ul>
                  <div>Tem certeza que deseja continuar?</div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="modal-btn cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="modal-btn delete"
                onClick={deleteAccount}
                disabled={saving}
              >
                {saving ? 'Excluindo...' : 'Excluir Conta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Account;