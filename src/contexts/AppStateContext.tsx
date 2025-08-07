import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { AppState, LayoutState, MainViewMode, RepositoryInfo, Organization, Workspace, UserInfo } from '../types/state';
import databaseService from '../services/database';

// Default state
const createDefaultLayoutState = (): LayoutState => ({
  sidebar: {
    width: 300,
    is_collapsed: false,
    selected_organization: undefined,
    selected_repositories: [],
    search_query: '',
    expanded_organizations: [],
    sort_by: 'last_accessed',
    filter: {
      status: undefined,
      sync_status: undefined,
      organization: undefined,
      has_conflicts: undefined,
      is_favorite: undefined,
      is_dirty: undefined
    }
  },
  main_view: {
    mode: 'history',
    filter: {
      author: undefined,
      date_range: undefined,
      branch: undefined,
      file_pattern: undefined,
      message_pattern: undefined,
      commit_type: undefined,
      organization: undefined,
      tags: undefined
    }
  },
  details_panel: {
    type: 'repository_overview',
    data: null,
    actions: [],
    is_collapsed: false,
    width: 350
  },
  header: {
    height: 48,
    show_breadcrumb: true,
    global_search: '',
    notifications: [],
    user_menu_open: false
  },
  theme: {
    mode: 'dark',
    font_size: 14,
    font_family: 'Inter',
    compact_mode: false
  },
  shortcuts: {}
});

const createDefaultWorkspace = (): Workspace => {
  return {
    id: 'default',
    name: 'My Workspace',
    description: 'Your main workspace for Git repositories',
    organizations: [],
    repositories: {},
    last_accessed: Date.now(),
    created_at: Date.now()
  };
};

const createDefaultAppState = (): AppState => ({
  workspaces: {
    'default': createDefaultWorkspace()
  },
  active_workspace: 'default',
  layout: createDefaultLayoutState(),
  current_repository: undefined,
  current_organization: undefined,
  bulk_operations: {},
  background_tasks: [],
  is_loading: false,
  last_sync: 0,
  settings: {
    auto_sync_interval: 5,
    max_recent_repos: 10,
    enable_notifications: true,
    enable_background_sync: true,
    theme_sync_with_system: true,
    performance_monitoring: false,
    telemetry_enabled: true,
    language: 'en',
    startup_behavior: 'last_workspace'
  },
  cache: {
    repositories: {},
    commits: {},
    file_diffs: {},
    search_results: {},
    last_cleanup: Date.now()
  },
  errors: [],
  performance: {
    memory_usage: 0,
    cpu_usage: 0,
    git_operations: [],
    ui_render_times: [],
    cache_hit_rate: 0,
    last_measured: Date.now()
  },
  is_first_time: true
});

// Action types
type AppAction = 
  | { type: 'SET_LAYOUT'; payload: Partial<LayoutState> }
  | { type: 'SET_CURRENT_REPOSITORY'; payload: string | undefined }
  | { type: 'SET_CURRENT_ORGANIZATION'; payload: string | undefined }
  | { type: 'SET_VIEW_MODE'; payload: MainViewMode }
  | { type: 'ADD_REPOSITORY'; payload: RepositoryInfo }
  | { type: 'REMOVE_REPOSITORY'; payload: string }
  | { type: 'UPDATE_REPOSITORY'; payload: RepositoryInfo }
  | { type: 'ADD_ORGANIZATION'; payload: Organization }
  | { type: 'UPDATE_ORGANIZATION'; payload: Organization }
  | { type: 'REMOVE_ORGANIZATION'; payload: string }
  | { type: 'SET_WORKSPACE'; payload: string }
  | { type: 'ADD_WORKSPACE'; payload: Workspace }
  | { type: 'UPDATE_WORKSPACE'; payload: Workspace }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_ERROR'; payload: any }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'RESET_STATE' }
  | { type: 'LOAD_PERSISTED_STATE'; payload: Partial<AppState> }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'SET_USER_INFO'; payload: UserInfo };

// Reducer
const appStateReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LAYOUT':
      return {
        ...state,
        layout: { ...state.layout, ...action.payload }
      };

    case 'SET_CURRENT_REPOSITORY':
      return {
        ...state,
        current_repository: action.payload
      };

    case 'SET_CURRENT_ORGANIZATION':
      return {
        ...state,
        current_organization: action.payload
      };

    case 'SET_VIEW_MODE':
      return {
        ...state,
        layout: {
          ...state.layout,
          main_view: {
            ...state.layout.main_view,
            mode: action.payload
          }
        }
      };

    case 'ADD_REPOSITORY': {
      const currentWorkspace = state.workspaces[state.active_workspace];
      return {
        ...state,
        workspaces: {
          ...state.workspaces,
          [state.active_workspace]: {
            ...currentWorkspace,
            repositories: {
              ...currentWorkspace.repositories,
              [action.payload.id]: action.payload
            }
          }
        }
      };
    }

    case 'REMOVE_REPOSITORY': {
      const currentWorkspace = state.workspaces[state.active_workspace];
      const { [action.payload]: removed, ...remainingRepos } = currentWorkspace.repositories;
      return {
        ...state,
        workspaces: {
          ...state.workspaces,
          [state.active_workspace]: {
            ...currentWorkspace,
            repositories: remainingRepos
          }
        },
        current_repository: state.current_repository === action.payload ? undefined : state.current_repository
      };
    }

    case 'UPDATE_REPOSITORY': {
      const currentWorkspace = state.workspaces[state.active_workspace];
      return {
        ...state,
        workspaces: {
          ...state.workspaces,
          [state.active_workspace]: {
            ...currentWorkspace,
            repositories: {
              ...currentWorkspace.repositories,
              [action.payload.id]: action.payload
            }
          }
        }
      };
    }

    case 'ADD_ORGANIZATION': {
      const currentWorkspace = state.workspaces[state.active_workspace];
      return {
        ...state,
        workspaces: {
          ...state.workspaces,
          [state.active_workspace]: {
            ...currentWorkspace,
            organizations: [...currentWorkspace.organizations, action.payload]
          }
        }
      };
    }

    case 'UPDATE_ORGANIZATION': {
      const currentWorkspace = state.workspaces[state.active_workspace];
      return {
        ...state,
        workspaces: {
          ...state.workspaces,
          [state.active_workspace]: {
            ...currentWorkspace,
            organizations: currentWorkspace.organizations.map(org =>
              org.id === action.payload.id ? action.payload : org
            )
          }
        }
      };
    }

    case 'REMOVE_ORGANIZATION': {
      const currentWorkspace = state.workspaces[state.active_workspace];
      return {
        ...state,
        workspaces: {
          ...state.workspaces,
          [state.active_workspace]: {
            ...currentWorkspace,
            organizations: currentWorkspace.organizations.filter(org => org.id !== action.payload)
          }
        },
        current_organization: state.current_organization === action.payload ? undefined : state.current_organization
      };
    }

    case 'SET_WORKSPACE':
      return {
        ...state,
        active_workspace: action.payload,
        current_repository: undefined,
        current_organization: undefined
      };

    case 'ADD_WORKSPACE':
      return {
        ...state,
        workspaces: {
          ...state.workspaces,
          [action.payload.id]: action.payload
        }
      };

    case 'UPDATE_WORKSPACE':
      return {
        ...state,
        workspaces: {
          ...state.workspaces,
          [action.payload.id]: action.payload
        }
      };

    case 'SET_LOADING':
      return {
        ...state,
        is_loading: action.payload
      };

    case 'ADD_ERROR':
      return {
        ...state,
        errors: [...state.errors, {
          id: Date.now().toString(),
          type: 'application_error',
          message: action.payload.message || 'An unknown error occurred',
          timestamp: Date.now(),
          is_resolved: false,
          ...action.payload
        }]
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: []
      };

    case 'RESET_STATE':
      return createDefaultAppState();

    case 'LOAD_PERSISTED_STATE':
      return {
        ...state,
        ...action.payload,
        // Ensure we don't lose critical runtime state
        is_loading: false,
        background_tasks: [],
        errors: []
      };

    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        is_first_time: false
      };

    case 'SET_USER_INFO':
      return {
        ...state,
        user: action.payload
      };

    default:
      return state;
  }
};

// Context
interface AppStateContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Convenience methods
  setLayout: (layout: Partial<LayoutState>) => void;
  setCurrentRepository: (repoId: string | undefined) => void;
  setCurrentOrganization: (orgId: string | undefined) => void;
  setViewMode: (mode: MainViewMode) => void;
  addRepository: (repo: RepositoryInfo) => void;
  removeRepository: (repoId: string) => void;
  updateRepository: (repo: RepositoryInfo) => void;
  addOrganization: (org: Organization) => Promise<void>;
  updateOrganization: (org: Organization) => void;
  removeOrganization: (orgId: string) => void;
  setWorkspace: (workspaceId: string) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspace: Workspace) => void;
  setLoading: (loading: boolean) => void;
  addError: (error: any) => void;
  clearErrors: () => void;
  resetState: () => void;
  completeOnboarding: () => Promise<void>;
  setUserInfo: (user: UserInfo) => Promise<void>;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

// Custom hook to use the context
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

// SQLite persistence helpers
const loadStateFromDatabase = async (): Promise<Partial<AppState> | null> => {
  try {
    // Initialize database first
    await databaseService.init();
    
    // Load user
    const user = await databaseService.getUser();
    
    // Load organizations and build workspace
    const organizations = await databaseService.getOrganizations();
    
    // Load repositories (for future use)
    const repositories = await databaseService.getRepositories();
    
    // Load settings
    const settings = await databaseService.getSettings();
    
    // Build workspace from database data
    const workspace: Workspace = {
      id: 'default',
      name: user?.workspace_name || 'My Workspace',
      description: user ? `${user.name}'s workspace` : 'Your main workspace',
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        color: org.color,
        description: org.description,
        avatar: org.avatar,
        repositories: [], // Will be populated from repositories table
        settings: {
          auto_fetch_interval: 5,
          auto_group_by_domain: true,
          default_branch_protection: false,
          notification_preferences: {
            pull_requests: true,
            merge_conflicts: true,
            sync_errors: true,
            build_status: false,
            mentions: true
          }
        },
        created_at: Date.parse(org.created_at),
        updated_at: Date.parse(org.updated_at)
      })),
      repositories: {},
      last_accessed: Date.now(),
      created_at: Date.now()
    };
    
    console.log('📖 State loaded from SQLite database:', {
      user: user?.name,
      organizations: organizations.length,
      repositories: repositories.length,
      is_first_time: settings.is_first_time
    });
    
    return {
      workspaces: { 'default': workspace },
      active_workspace: 'default',
      user: user || undefined,
      is_first_time: settings.is_first_time,
      settings: {
        auto_sync_interval: 5,
        max_recent_repos: 10,
        enable_notifications: true,
        enable_background_sync: true,
        theme_sync_with_system: true,
        performance_monitoring: false,
        telemetry_enabled: true,
        language: settings.language,
        startup_behavior: 'last_workspace' as const
      }
    };
  } catch (error) {
    console.warn('Failed to load state from database:', error);
    return null;
  }
};

// Provider component
interface AppStateProviderProps {
  children: React.ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, createDefaultAppState());
  const [isLoading, setIsLoading] = React.useState(true);

  // Convenience methods - Define all hooks before any conditional returns
  const setLayout = useCallback((layout: Partial<LayoutState>) => {
    dispatch({ type: 'SET_LAYOUT', payload: layout });
  }, []);

  const setCurrentRepository = useCallback((repoId: string | undefined) => {
    dispatch({ type: 'SET_CURRENT_REPOSITORY', payload: repoId });
  }, []);

  const setCurrentOrganization = useCallback((orgId: string | undefined) => {
    dispatch({ type: 'SET_CURRENT_ORGANIZATION', payload: orgId });
  }, []);

  const setViewMode = useCallback((mode: MainViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  const addRepository = useCallback((repo: RepositoryInfo) => {
    dispatch({ type: 'ADD_REPOSITORY', payload: repo });
  }, []);

  const removeRepository = useCallback((repoId: string) => {
    dispatch({ type: 'REMOVE_REPOSITORY', payload: repoId });
  }, []);

  const updateRepository = useCallback((repo: RepositoryInfo) => {
    dispatch({ type: 'UPDATE_REPOSITORY', payload: repo });
  }, []);

  const addOrganization = useCallback(async (org: Organization) => {
    try {
      await databaseService.saveOrganization({
        id: org.id,
        name: org.name,
        color: org.color,
        description: org.description,
        avatar: org.avatar,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      dispatch({ type: 'ADD_ORGANIZATION', payload: org });
    } catch (error) {
      console.error('Failed to save organization to database:', error);
    }
  }, []);

  const updateOrganization = useCallback((org: Organization) => {
    dispatch({ type: 'UPDATE_ORGANIZATION', payload: org });
  }, []);

  const removeOrganization = useCallback((orgId: string) => {
    dispatch({ type: 'REMOVE_ORGANIZATION', payload: orgId });
  }, []);

  const setWorkspace = useCallback((workspaceId: string) => {
    dispatch({ type: 'SET_WORKSPACE', payload: workspaceId });
  }, []);

  const addWorkspace = useCallback((workspace: Workspace) => {
    dispatch({ type: 'ADD_WORKSPACE', payload: workspace });
  }, []);

  const updateWorkspace = useCallback((workspace: Workspace) => {
    dispatch({ type: 'UPDATE_WORKSPACE', payload: workspace });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const addError = useCallback((error: any) => {
    dispatch({ type: 'ADD_ERROR', payload: error });
  }, []);

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await databaseService.completeOnboarding();
      dispatch({ type: 'COMPLETE_ONBOARDING' });
    } catch (error) {
      console.error('Failed to complete onboarding in database:', error);
    }
  }, []);

  const setUserInfo = useCallback(async (user: UserInfo) => {
    console.log('🔄 Atualizando dados do usuário no estado:', user);
    try {
      await databaseService.saveUser({
        name: user.name,
        email: user.email,
        workspace_name: user.workspace_name
      });
      dispatch({ type: 'SET_USER_INFO', payload: user });
    } catch (error) {
      console.error('Failed to save user to database:', error);
    }
  }, []);

  // Load state from SQLite on mount
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        console.log('🚀 Starting app initialization...');
        setIsLoading(true);
        
        // Try to migrate from localStorage first
        console.log('🔄 Attempting localStorage migration...');
        await databaseService.migrateFromLocalStorage();
        
        // Load state from database
        console.log('📖 Loading state from database...');
        const persistedState = await loadStateFromDatabase();
        console.log('📊 Persisted state loaded:', persistedState);
        
        if (persistedState) {
          dispatch({ type: 'LOAD_PERSISTED_STATE', payload: persistedState });
          console.log('✅ State loaded successfully');
        } else {
          console.log('⚠️ No persisted state found - using default state');
        }
      } catch (error) {
        console.error('❌ Failed to load initial state:', error);
      } finally {
        setIsLoading(false);
        console.log('🏁 App initialization complete');
      }
    };
    
    loadInitialState();
  }, []);

  const value: AppStateContextValue = {
    state,
    dispatch,
    setLayout,
    setCurrentRepository,
    setCurrentOrganization,
    setViewMode,
    addRepository,
    removeRepository,
    updateRepository,
    addOrganization,
    updateOrganization,
    removeOrganization,
    setWorkspace,
    addWorkspace,
    updateWorkspace,
    setLoading,
    addError,
    clearErrors,
    resetState,
    completeOnboarding,
    setUserInfo
  };

  // Don't render children until state is loaded
  if (isLoading) {
    return (
      <AppStateContext.Provider value={value}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#0a0b0d',
          color: 'white',
          fontFamily: 'Inter',
          fontSize: '14px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '16px', fontSize: '24px' }}>🗄️</div>
            <div>Initializing database...</div>
          </div>
        </div>
      </AppStateContext.Provider>
    );
  }

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export default AppStateProvider;