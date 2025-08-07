import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { AppState, LayoutState, MainViewMode, RepositoryInfo, Organization, Workspace } from '../types/state';

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
    filter: {}
  },
  main_view: {
    mode: 'history',
    filter: {}
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

const createDefaultWorkspace = (): Workspace => ({
  id: 'default',
  name: 'Default Workspace',
  description: 'Default workspace for CodeGit',
  organizations: [],
  repositories: {},
  last_accessed: Date.now(),
  created_at: Date.now()
});

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
  }
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
  | { type: 'LOAD_PERSISTED_STATE'; payload: Partial<AppState> };

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
  addOrganization: (org: Organization) => void;
  updateOrganization: (org: Organization) => void;
  removeOrganization: (orgId: string) => void;
  setWorkspace: (workspaceId: string) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspace: Workspace) => void;
  setLoading: (loading: boolean) => void;
  addError: (error: any) => void;
  clearErrors: () => void;
  resetState: () => void;
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

// Storage keys
const STORAGE_KEY = 'codegit_app_state';
const STORAGE_VERSION = '1.0.0';

// Persistence helpers
const saveStateToStorage = (state: AppState) => {
  try {
    const stateToSave = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      state: {
        workspaces: state.workspaces,
        active_workspace: state.active_workspace,
        layout: state.layout,
        current_repository: state.current_repository,
        current_organization: state.current_organization,
        settings: state.settings
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error);
  }
};

const loadStateFromStorage = (): Partial<AppState> | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (parsed.version !== STORAGE_VERSION) {
      console.warn('State version mismatch, ignoring saved state');
      return null;
    }

    return parsed.state;
  } catch (error) {
    console.warn('Failed to load state from localStorage:', error);
    return null;
  }
};

// Provider component
interface AppStateProviderProps {
  children: React.ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, createDefaultAppState());

  // Load persisted state on mount
  useEffect(() => {
    const persistedState = loadStateFromStorage();
    if (persistedState) {
      dispatch({ type: 'LOAD_PERSISTED_STATE', payload: persistedState });
    }
  }, []);

  // Save state to localStorage when it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveStateToStorage(state);
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [state]);

  // Convenience methods
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

  const addOrganization = useCallback((org: Organization) => {
    dispatch({ type: 'ADD_ORGANIZATION', payload: org });
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
    localStorage.removeItem(STORAGE_KEY);
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
    resetState
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export default AppStateProvider;