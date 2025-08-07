import React from 'react';
import { useAppState } from '../../contexts/AppStateContext';

const UserDataDebug: React.FC = () => {
  const { state } = useAppState();

  const localStorageData = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('codegit_app_state');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '300px',
      whiteSpace: 'pre-wrap'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        🐛 Debug - Dados do Usuário
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <strong>Estado Atual:</strong>
        <br />
        Nome: {state.user?.name || 'Não informado'}
        <br />
        Email: {state.user?.email || 'Não informado'}
        <br />
        Workspace: {state.user?.workspace_name || 'Não informado'}
        <br />
        Primeiro acesso: {state.is_first_time ? 'Sim' : 'Não'}
      </div>

      {localStorageData && (
        <div>
          <strong>localStorage:</strong>
          <br />
          Versão: {localStorageData.version}
          <br />
          Usuário salvo: {localStorageData.state?.user?.name || 'Não encontrado'}
        </div>
      )}
    </div>
  );
};

export default UserDataDebug;