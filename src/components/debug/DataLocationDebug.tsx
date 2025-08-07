import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useAppState } from '../../contexts/AppStateContext';

interface DatabaseData {
  user: any;
  organizations: any[];
  repositories: any[];
  settings: any;
}

const DataLocationDebug: React.FC = () => {
  const { state } = useAppState();
  const [databaseData, setDatabaseData] = useState<DatabaseData | null>(null);
  const [localStorageData, setLocalStorageData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkLocalStorage = () => {
    try {
      const savedData = localStorage.getItem('codegit_app_state');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setLocalStorageData(parsed);
      } else {
        setLocalStorageData(null);
      }
    } catch (err) {
      setLocalStorageData({ error: 'Failed to parse localStorage data' });
    }
  };

  const checkSQLiteDatabase = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await invoke('get_user_info');
      const organizations = await invoke('get_organizations');
      const repositories = await invoke('get_repositories');
      const settings = await invoke('get_app_settings');

      // Also get database info and migration status
      const dbInfo = await invoke('get_database_info');
      const migrationStatus = await invoke('verify_data_migration');

      console.log('🗄️ Database Info:', dbInfo);
      console.log('🔄 Migration Status:', migrationStatus);

      setDatabaseData({
        user,
        organizations,
        repositories,
        settings,
        dbInfo,
        migrationStatus
      });
    } catch (err: any) {
      setError(`SQLite Error: ${err}`);
      setDatabaseData(null);
    } finally {
      setLoading(false);
    }
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('codegit_app_state');
    setLocalStorageData(null);
  };

  useEffect(() => {
    checkLocalStorage();
    checkSQLiteDatabase();
  }, []);

  const refreshAll = () => {
    checkLocalStorage();
    checkSQLiteDatabase();
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: 'rgba(0,0,0,0.95)',
      color: 'white',
      padding: '20px',
      borderRadius: '12px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      width: '500px',
      maxHeight: '80vh',
      overflow: 'auto',
      border: '1px solid #333'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
        borderBottom: '1px solid #333',
        paddingBottom: '8px'
      }}>
        <h3 style={{ margin: 0, color: '#3b82f6' }}>🔍 Data Location Debug</h3>
        <button 
          onClick={refreshAll}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Refresh
        </button>
      </div>

      {/* Current State */}
      <div style={{ marginBottom: '16px', padding: '8px', background: '#1a1a1a', borderRadius: '4px' }}>
        <strong style={{ color: '#10b981' }}>📱 Current React State:</strong>
        <div style={{ marginTop: '4px', fontSize: '10px' }}>
          User: {state.user?.name || 'Not loaded'}
          <br />
          Organizations: {state.workspaces?.default?.organizations?.length || 0}
          <br />
          First Time: {state.is_first_time ? 'Yes' : 'No'}
        </div>
      </div>

      {/* localStorage Data */}
      <div style={{ marginBottom: '16px', padding: '8px', background: '#1a1a1a', borderRadius: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: localStorageData ? '#f59e0b' : '#10b981' }}>
            🌐 localStorage:
          </strong>
          {localStorageData && (
            <button 
              onClick={clearLocalStorage}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '2px 6px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '9px'
              }}
            >
              Clear
            </button>
          )}
        </div>
        
        {localStorageData ? (
          <div style={{ marginTop: '4px', fontSize: '10px', color: '#f59e0b' }}>
            ⚠️ Data found in localStorage:
            <pre style={{ fontSize: '9px', color: '#ccc', marginTop: '4px', overflow: 'hidden' }}>
              {JSON.stringify(localStorageData, null, 2).substring(0, 200)}...
            </pre>
          </div>
        ) : (
          <div style={{ marginTop: '4px', fontSize: '10px', color: '#10b981' }}>
            ✅ No data in localStorage (Good!)
          </div>
        )}
      </div>

      {/* SQLite Database */}
      <div style={{ padding: '8px', background: '#1a1a1a', borderRadius: '4px' }}>
        <strong style={{ color: databaseData ? '#10b981' : '#f59e0b' }}>
          🗄️ SQLite Database:
        </strong>
        
        {loading && (
          <div style={{ marginTop: '4px', fontSize: '10px', color: '#3b82f6' }}>
            Loading database data...
          </div>
        )}

        {error && (
          <div style={{ marginTop: '4px', fontSize: '10px', color: '#ef4444' }}>
            ❌ {error}
          </div>
        )}

        {databaseData && !loading && (
          <div style={{ marginTop: '8px', fontSize: '10px' }}>
            <div style={{ color: '#10b981', marginBottom: '8px' }}>
              ✅ Data found in SQLite:
            </div>

            <div style={{ marginBottom: '6px' }}>
              <strong>User:</strong> {databaseData.user?.name || 'None'}
              {databaseData.user && (
                <div style={{ marginLeft: '12px', color: '#ccc' }}>
                  Email: {databaseData.user.email}
                  <br />
                  Workspace: {databaseData.user.workspace_name || 'Not set'}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '6px' }}>
              <strong>Organizations:</strong> {databaseData.organizations?.length || 0}
              {databaseData.organizations?.map((org: any) => (
                <div key={org.id} style={{ marginLeft: '12px', color: '#ccc' }}>
                  • {org.name} ({org.color})
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '6px' }}>
              <strong>Repositories:</strong> {databaseData.repositories?.length || 0}
              {databaseData.repositories?.slice(0, 3).map((repo: any) => (
                <div key={repo.id} style={{ marginLeft: '12px', color: '#ccc' }}>
                  • {repo.name}
                </div>
              ))}
              {databaseData.repositories?.length > 3 && (
                <div style={{ marginLeft: '12px', color: '#666' }}>
                  ... and {databaseData.repositories.length - 3} more
                </div>
              )}
            </div>

            <div>
              <strong>Settings:</strong>
              <div style={{ marginLeft: '12px', color: '#ccc' }}>
                First Time: {databaseData.settings?.is_first_time ? 'Yes' : 'No'}
                <br />
                Theme: {databaseData.settings?.theme_mode || 'dark'}
                <br />
                Language: {databaseData.settings?.language || 'en'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ 
        marginTop: '16px', 
        padding: '8px', 
        background: databaseData && !localStorageData ? '#065f46' : '#7c2d12', 
        borderRadius: '4px',
        textAlign: 'center'
      }}>
        {databaseData && !localStorageData ? (
          <div style={{ color: '#10b981' }}>
            ✅ <strong>Perfect!</strong> Data is in SQLite, localStorage is clean
          </div>
        ) : (
          <div style={{ color: '#f59e0b' }}>
            ⚠️ <strong>Migration needed:</strong> Data still in localStorage
          </div>
        )}
      </div>
    </div>
  );
};

export default DataLocationDebug;