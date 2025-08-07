import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import './UserSelection.css';

interface UserSelectionProps {
  onNewUser: () => void;
  onExistingUser: (userData: any) => void;
}

interface SavedUser {
  id?: number;
  name: string;
  email: string;
  workspace_name?: string;
  created_at: string;
  updated_at?: string;
}

const UserSelection: React.FC<UserSelectionProps> = ({ onNewUser, onExistingUser }) => {
  const [savedUsers, setSavedUsers] = useState<SavedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedUsers();
  }, []);

  const loadSavedUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar usuários salvos no banco
      const dbInfo = await invoke('get_database_info') as any;
      
      if (dbInfo.tables?.users > 0) {
        // Se há usuários, buscar os dados
        const userData = await invoke('get_user_info') as SavedUser | null;
        if (userData) {
          setSavedUsers([userData]);
        }
      } else {
        setSavedUsers([]);
      }
    } catch (err) {
      console.error('Error loading saved users:', err);
      setError('Erro ao carregar usuários salvos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExistingUser = (user: SavedUser) => {
    onExistingUser({
      name: user.name,
      email: user.email,
      workspace_name: user.workspace_name || `${user.name}'s Workspace`
    });
  };

  if (loading) {
    return (
      <div className="user-selection-container">
        <div className="user-selection-card">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h2>Carregando...</h2>
            <p>Verificando usuários salvos</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-selection-container">
      <div className="user-selection-card">
        {/* Header */}
        <div className="selection-header">
          <div className="app-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <h1>Bem-vindo de volta ao CodeGit</h1>
          <p>Como gostaria de continuar?</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="error-message">
            <span>⚠️</span>
            <div>
              <strong>Erro:</strong> {error}
              <button onClick={loadSavedUsers}>Tentar novamente</button>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="selection-options">
          {/* Existing User Option */}
          {savedUsers.length > 0 && (
            <div className="option-section">
              <h3>Usuário Existente</h3>
              {savedUsers.map((user, index) => (
                <button
                  key={index}
                  className="user-option existing-user"
                  onClick={() => handleSelectExistingUser(user)}
                >
                  <div className="user-avatar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-email">{user.email}</div>
                    <div className="user-workspace">
                      {user.workspace_name || `${user.name}'s Workspace`}
                    </div>
                  </div>
                  <div className="option-arrow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z"/>
                    </svg>
                  </div>
                </button>
              ))}
              
              <div className="option-description">
                <p>Continue com sua conta existente e mantenha todas as configurações e dados.</p>
              </div>
            </div>
          )}

          {/* New User Option */}
          <div className="option-section">
            <h3>{savedUsers.length > 0 ? 'Nova Conta' : 'Começar Agora'}</h3>
            <button
              className="user-option new-user"
              onClick={onNewUser}
            >
              <div className="user-avatar new">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </div>
              <div className="user-info">
                <div className="user-name">Criar Nova Conta</div>
                <div className="user-email">Configure um novo perfil</div>
                <div className="user-workspace">Novo workspace personalizado</div>
              </div>
              <div className="option-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z"/>
                </svg>
              </div>
            </button>
            
            <div className="option-description">
              <p>
                {savedUsers.length > 0 
                  ? 'Crie uma nova conta e configure um workspace diferente.' 
                  : 'Configure seu perfil e comece a usar o CodeGit.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="selection-footer">
          <div className="version-info">
            <span>CodeGit v3.0.0</span>
          </div>
          <div className="help-links">
            <a href="#" onClick={(e) => e.preventDefault()}>
              Precisa de ajuda?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSelection;