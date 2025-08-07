import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { repositoryDiscovery } from '../services/RepositoryDiscoveryService';
import { RepositoryInfo, Organization } from '../types/state';

interface UseRepositoryDiscoveryOptions {
  watchPaths?: string[];
  autoDetect?: boolean;
  autoGroup?: boolean;
  scanDepth?: number;
}

interface UseRepositoryDiscoveryResult {
  isScanning: boolean;
  foundRepositories: RepositoryInfo[];
  suggestedOrganizations: Organization[];
  scanDirectory: (path: string) => Promise<void>;
  scanMultiplePaths: (paths: string[]) => Promise<void>;
  addRepository: (path: string) => Promise<void>;
  removeRepository: (repoId: string) => Promise<void>;
  acceptOrganization: (orgId: string) => void;
  rejectOrganization: (orgId: string) => void;
  startWatching: () => Promise<void>;
  stopWatching: () => void;
  error: string | null;
  clearError: () => void;
}

export const useRepositoryDiscovery = (
  options: UseRepositoryDiscoveryOptions = {}
): UseRepositoryDiscoveryResult => {
  const {
    watchPaths = [],
    autoDetect = false,
    autoGroup = true,
    scanDepth = 3
  } = options;

  const { 
    state, 
    addRepository: addRepoToState, 
    removeRepository: removeRepoFromState,
    addOrganization,
    setLoading,
    addError
  } = useAppState();

  const [isScanning, setIsScanning] = useState(false);
  const [foundRepositories, setFoundRepositories] = useState<RepositoryInfo[]>([]);
  const [suggestedOrganizations, setSuggestedOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  const watchingRef = useRef(false);
  const lastScanRef = useRef<number>(0);

  // Auto-detect repositories on mount if enabled
  useEffect(() => {
    if (autoDetect && watchPaths.length > 0) {
      scanMultiplePaths(watchPaths);
    }
  }, [autoDetect]);

  // Start watching directories if specified
  useEffect(() => {
    if (watchPaths.length > 0 && !watchingRef.current) {
      startWatching();
    }

    return () => {
      if (watchingRef.current) {
        stopWatching();
      }
    };
  }, [watchPaths]);

  const handleRepositoriesFound = useCallback((newRepos: RepositoryInfo[]) => {
    setFoundRepositories(prev => {
      // Merge with existing, avoiding duplicates
      const existing = new Set(prev.map(r => r.path));
      const filtered = newRepos.filter(r => !existing.has(r.path));
      return [...prev, ...filtered];
    });

    // Auto-group if enabled
    if (autoGroup && newRepos.length > 0) {
      generateOrganizationSuggestions(newRepos);
    }
  }, [autoGroup]);

  const generateOrganizationSuggestions = useCallback(async (repos: RepositoryInfo[]) => {
    try {
      const grouping = await repositoryDiscovery.groupByOrganization(repos);
      
      const organizations: Organization[] = grouping.organizations
        .filter(org => org.confidence > 0.5) // Only suggest high-confidence groupings
        .map(org => ({
          id: org.id,
          name: org.name,
          color: generateOrgColor(org.name),
          description: `Auto-detected from ${org.detection_method}`,
          repositories: org.repositories,
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
          created_at: Date.now(),
          updated_at: Date.now()
        }));

      setSuggestedOrganizations(prev => {
        const existing = new Set(prev.map(o => o.name.toLowerCase()));
        const filtered = organizations.filter(o => !existing.has(o.name.toLowerCase()));
        return [...prev, ...filtered];
      });
    } catch (err) {
      console.error('Failed to generate organization suggestions:', err);
    }
  }, []);

  const scanDirectory = useCallback(async (path: string) => {
    setIsScanning(true);
    setError(null);
    
    try {
      const repos = await repositoryDiscovery.scanDirectory(path, scanDepth);
      handleRepositoriesFound(repos);
      lastScanRef.current = Date.now();
    } catch (err: any) {
      const errorMessage = `Failed to scan directory: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      addError({ message: errorMessage, type: 'filesystem_error' });
    } finally {
      setIsScanning(false);
    }
  }, [scanDepth, handleRepositoriesFound, addError]);

  const scanMultiplePaths = useCallback(async (paths: string[]) => {
    setIsScanning(true);
    setError(null);
    
    try {
      const repos = await repositoryDiscovery.detectRepositories(paths);
      handleRepositoriesFound(repos);
      lastScanRef.current = Date.now();
    } catch (err: any) {
      const errorMessage = `Failed to scan directories: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      addError({ message: errorMessage, type: 'filesystem_error' });
    } finally {
      setIsScanning(false);
    }
  }, [handleRepositoriesFound, addError]);

  const addRepository = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const repo = await repositoryDiscovery.addRepository(path);
      addRepoToState(repo);
      
      // Remove from found repositories if it exists there
      setFoundRepositories(prev => prev.filter(r => r.path !== path));
      
      // Generate organization suggestions for the new repo
      if (autoGroup) {
        generateOrganizationSuggestions([repo]);
      }
    } catch (err: any) {
      const errorMessage = `Failed to add repository: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      addError({ message: errorMessage, type: 'git_error' });
    } finally {
      setLoading(false);
    }
  }, [addRepoToState, setLoading, addError, autoGroup, generateOrganizationSuggestions]);

  const removeRepository = useCallback(async (repoId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await repositoryDiscovery.removeRepository(repoId);
      if (success) {
        removeRepoFromState(repoId);
        // Also remove from found repositories
        setFoundRepositories(prev => prev.filter(r => r.id !== repoId));
      }
    } catch (err: any) {
      const errorMessage = `Failed to remove repository: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      addError({ message: errorMessage, type: 'application_error' });
    } finally {
      setLoading(false);
    }
  }, [removeRepoFromState, setLoading, addError]);

  const acceptOrganization = useCallback((orgId: string) => {
    const suggestion = suggestedOrganizations.find(org => org.id === orgId);
    if (suggestion) {
      addOrganization(suggestion);
      
      // Update repositories to belong to this organization
      const currentWorkspace = state.workspaces[state.active_workspace];
      suggestion.repositories.forEach(repoId => {
        const repo = currentWorkspace.repositories[repoId];
        if (repo) {
          const updatedRepo = { ...repo, organization_id: orgId };
          // We would need to add an updateRepository method to the context
          console.log('Would update repository:', repoId, 'to organization:', orgId);
        }
      });
      
      // Remove from suggestions
      setSuggestedOrganizations(prev => prev.filter(org => org.id !== orgId));
    }
  }, [suggestedOrganizations, addOrganization, state]);

  const rejectOrganization = useCallback((orgId: string) => {
    setSuggestedOrganizations(prev => prev.filter(org => org.id !== orgId));
  }, []);

  const startWatching = useCallback(async () => {
    if (watchingRef.current || watchPaths.length === 0) return;
    
    try {
      watchingRef.current = true;
      setIsWatching(true);
      
      await repositoryDiscovery.watchForChanges(watchPaths, (repos) => {
        // Throttle updates to avoid spam
        const now = Date.now();
        if (now - lastScanRef.current > 5000) { // 5 second throttle
          handleRepositoriesFound(repos);
          lastScanRef.current = now;
        }
      });
    } catch (err: any) {
      const errorMessage = `Failed to start watching: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      addError({ message: errorMessage, type: 'filesystem_error' });
      watchingRef.current = false;
      setIsWatching(false);
    }
  }, [watchPaths, handleRepositoriesFound, addError]);

  const stopWatching = useCallback(() => {
    if (!watchingRef.current) return;
    
    try {
      repositoryDiscovery.stopWatching();
      watchingRef.current = false;
      setIsWatching(false);
    } catch (err: any) {
      console.error('Failed to stop watching:', err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isScanning,
    foundRepositories,
    suggestedOrganizations,
    scanDirectory,
    scanMultiplePaths,
    addRepository,
    removeRepository,
    acceptOrganization,
    rejectOrganization,
    startWatching,
    stopWatching,
    error,
    clearError
  };
};

// Helper function to generate consistent colors for organizations
function generateOrgColor(name: string): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#ec4899', // pink
    '#6b7280'  // gray
  ];
  
  // Generate a consistent hash from the organization name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export default useRepositoryDiscovery;