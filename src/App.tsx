import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import "./App.css";

interface GitCommit {
  id: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
}

interface GitStatus {
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
}

interface GitBranch {
  name: string;
  is_head: boolean;
  is_remote: boolean;
  target?: string;
}

interface GitDiff {
  file_path: string;
  old_content: string;
  new_content: string;
  hunks: DiffHunk[];
}

interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  lines: DiffLine[];
}

interface DiffLine {
  origin: string;
  content: string;
  old_lineno?: number;
  new_lineno?: number;
}

interface GitRemote {
  name: string;
  url: string;
  fetch_refspecs: string[];
  push_refspecs: string[];
}

interface GitStash {
  index: number;
  message: string;
  author: string;
  timestamp: number;
}

interface MergeConflict {
  file_path: string;
  ancestor_content: string;
  our_content: string;
  their_content: string;
  resolution?: string;
}

interface LogEntry {
  id: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  parents: string[];
  refs: string[];
}

interface RebaseCommit {
  id: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  action: 'Pick' | 'Squash' | 'Edit' | 'Reword' | 'Drop';
}

interface RebasePlan {
  commits: RebaseCommit[];
  onto_branch: string;
}

interface GitSubmodule {
  name: string;
  path: string;
  url: string;
  branch?: string;
  head_id: string;
  workdir_id?: string;
  status: 'Uninitialized' | 'Initialized' | 'Modified' | 'UpToDate';
}

interface RepositoryInfo {
  name: string;
  path: string;
  current_branch: string;
  last_commit: string;
  is_dirty: boolean;
  last_accessed: number;
}

interface FileContent {
  path: string;
  content: string;
  is_binary: boolean;
  size: number;
}

interface BranchInfo {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  commit_count: number;
  last_commit_message: string;
  last_commit_date: number;
}

function App() {
  const [repoPath, setRepoPath] = useState("");
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [stashes, setStashes] = useState<GitStash[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [conflicts, setConflicts] = useState<MergeConflict[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [fileDiff, setFileDiff] = useState<GitDiff | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<MergeConflict | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "status" | "commits" | "branches" | "remotes" | "stash" | "conflicts" | "graph" | "diff" | "rebase" | "submodules" | "files">("dashboard");
  
  // New dashboard states
  const [repositories, setRepositories] = useState<RepositoryInfo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepositoryInfo | null>(null);
  const [detailedBranches, setDetailedBranches] = useState<BranchInfo[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [showRepoSelection, setShowRepoSelection] = useState(true);
  
  // Commit form states
  const [commitMessage, setCommitMessage] = useState("");
  const [authorName, setAuthorName] = useState("CodeGit User");
  const [authorEmail, setAuthorEmail] = useState("user@codegit.com");
  const [newBranchName, setNewBranchName] = useState("");
  
  // Remote form states
  const [newRemoteName, setNewRemoteName] = useState("");
  const [newRemoteUrl, setNewRemoteUrl] = useState("");
  
  // Stash form states
  const [stashMessage, setStashMessage] = useState("");
  
  // Clone form states
  const [cloneUrl, setCloneUrl] = useState("");
  const [clonePath, setClonePath] = useState("");
  
  // Drag and drop states
  const [draggedFile, setDraggedFile] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  
  // Interactive Rebase states
  const [rebasePlan, setRebasePlan] = useState<RebasePlan | null>(null);
  const [isRebaseMode, setIsRebaseMode] = useState(false);
  const [draggedRebaseCommit, setDraggedRebaseCommit] = useState<RebaseCommit | null>(null);
  
  // Submodule states
  const [submodules, setSubmodules] = useState<GitSubmodule[]>([]);
  const [newSubmoduleUrl, setNewSubmoduleUrl] = useState("");
  const [newSubmodulePath, setNewSubmodulePath] = useState("");
  const [newSubmoduleBranch, setNewSubmoduleBranch] = useState("");

  // Load repositories on component mount
  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    try {
      setLoading(true);
      const repos = await invoke<RepositoryInfo[]>("discover_repositories");
      setRepositories(repos);
      setError("");
    } catch (err) {
      setError(`Failed to discover repositories: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const selectRepository = async (repo: RepositoryInfo) => {
    setSelectedRepo(repo);
    setRepoPath(repo.path);
    setShowRepoSelection(false);
    setActiveTab("status");
    
    try {
      // Load detailed branches
      const branchesInfo = await invoke<BranchInfo[]>("get_detailed_branches", {
        repoPath: repo.path
      });
      setDetailedBranches(branchesInfo);
      
      // Auto-select current branch
      const currentBranch = branchesInfo.find(b => b.is_current);
      if (currentBranch) {
        setSelectedBranch(currentBranch.name);
      }
      
      await loadRepositoryData(repo.path);
    } catch (err) {
      setError(`Failed to select repository: ${err}`);
    }
  };

  const loadFileContent = async (filePath: string) => {
    if (!repoPath) return;
    
    try {
      const content = await invoke<FileContent>("get_file_content", {
        repoPath,
        filePath
      });
      setFileContent(content);
    } catch (err) {
      setError(`Failed to load file content: ${err}`);
    }
  };

  const openRepository = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Git Repository"
      });
      
      if (selected && typeof selected === 'string') {
        setRepoPath(selected);
        await loadRepositoryData(selected);
      }
    } catch (err) {
      setError(`Failed to open repository: ${err}`);
    }
  };

  const loadRepositoryData = async (path: string) => {
    setLoading(true);
    setError("");
    
    try {
      // Load commits
      const commitsResult = await invoke<GitCommit[]>("get_commits", { 
        repoPath: path, 
        limit: 20 
      });
      setCommits(commitsResult);

      // Load status
      const statusResult = await invoke<GitStatus>("get_repository_status", { 
        repoPath: path 
      });
      setStatus(statusResult);

      // Load branches
      const branchesResult = await invoke<GitBranch[]>("get_branches", {
        repoPath: path
      });
      setBranches(branchesResult);

      // Load remotes
      const remotesResult = await invoke<GitRemote[]>("get_remotes", {
        repoPath: path
      });
      setRemotes(remotesResult);

      // Load stashes
      const stashesResult = await invoke<GitStash[]>("get_stashes", {
        repoPath: path
      });
      setStashes(stashesResult);

      // Load log graph
      const logResult = await invoke<LogEntry[]>("get_log_graph", {
        repoPath: path,
        limit: 50
      });
      setLogEntries(logResult);

      // Check for merge conflicts
      try {
        const conflictsResult = await invoke<MergeConflict[]>("get_merge_conflicts", {
          repoPath: path
        });
        setConflicts(conflictsResult);
      } catch {
        // No conflicts or error - that's fine
        setConflicts([]);
      }

      // Load submodules
      try {
        const submodulesResult = await invoke<GitSubmodule[]>("get_submodules", {
          repoPath: path
        });
        setSubmodules(submodulesResult);
      } catch {
        // No submodules or error - that's fine
        setSubmodules([]);
      }
    } catch (err) {
      setError(`Failed to load repository data: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const stageFile = async (filePath: string) => {
    try {
      await invoke("stage_file", { repoPath, filePath });
      await loadRepositoryData(repoPath);
    } catch (err) {
      setError(`Failed to stage file: ${err}`);
    }
  };

  const unstageFile = async (filePath: string) => {
    try {
      await invoke("unstage_file", { repoPath, filePath });
      await loadRepositoryData(repoPath);
    } catch (err) {
      setError(`Failed to unstage file: ${err}`);
    }
  };

  const commitChanges = async () => {
    if (!commitMessage.trim()) {
      setError("Commit message is required");
      return;
    }

    try {
      await invoke("commit_changes", {
        repoPath,
        message: commitMessage,
        authorName,
        authorEmail
      });
      setCommitMessage("");
      await loadRepositoryData(repoPath);
      setError("");
    } catch (err) {
      setError(`Failed to commit changes: ${err}`);
    }
  };

  const viewFileDiff = async (filePath: string) => {
    try {
      const diffResult = await invoke<GitDiff>("get_file_diff", {
        repoPath,
        filePath
      });
      setFileDiff(diffResult);
      setSelectedFile(filePath);
      setActiveTab("diff");
    } catch (err) {
      setError(`Failed to get file diff: ${err}`);
    }
  };

  const createBranch = async () => {
    if (!newBranchName.trim()) {
      setError("Branch name is required");
      return;
    }

    try {
      await invoke("create_branch", {
        repoPath,
        branchName: newBranchName
      });
      setNewBranchName("");
      await loadRepositoryData(repoPath);
    } catch (err) {
      setError(`Failed to create branch: ${err}`);
    }
  };

  const switchBranch = async (branchName: string) => {
    try {
      await invoke("switch_branch", {
        repoPath,
        branchName
      });
      await loadRepositoryData(repoPath);
    } catch (err) {
      setError(`Failed to switch branch: ${err}`);
    }
  };

  const addRemote = async () => {
    if (!newRemoteName.trim() || !newRemoteUrl.trim()) {
      setError("Remote name and URL are required");
      return;
    }

    try {
      await invoke("add_remote", {
        repoPath,
        name: newRemoteName,
        url: newRemoteUrl
      });
      setNewRemoteName("");
      setNewRemoteUrl("");
      await loadRepositoryData(repoPath);
    } catch (err) {
      setError(`Failed to add remote: ${err}`);
    }
  };

  const removeRemote = async (remoteName: string) => {
    try {
      await invoke("remove_remote", {
        repoPath,
        name: remoteName
      });
      await loadRepositoryData(repoPath);
    } catch (err) {
      setError(`Failed to remove remote: ${err}`);
    }
  };

  const fetchFromRemote = async (remoteName: string) => {
    try {
      setLoading(true);
      await invoke("fetch_from_remote", {
        repoPath,
        remoteName
      });
      await loadRepositoryData(repoPath);
      setError("");
    } catch (err) {
      setError(`Failed to fetch: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const pullFromRemote = async (remoteName: string, branchName: string) => {
    try {
      setLoading(true);
      await invoke("pull_from_remote", {
        repoPath,
        remoteName,
        branchName
      });
      await loadRepositoryData(repoPath);
      setError("");
    } catch (err) {
      setError(`Failed to pull: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const pushToRemote = async (remoteName: string, branchName: string) => {
    try {
      setLoading(true);
      await invoke("push_to_remote", {
        repoPath,
        remoteName,
        branchName
      });
      setError("");
    } catch (err) {
      setError(`Failed to push: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const cloneRepository = async () => {
    if (!cloneUrl.trim() || !clonePath.trim()) {
      setError("Clone URL and path are required");
      return;
    }

    try {
      setLoading(true);
      await invoke("clone_repository", {
        url: cloneUrl,
        path: clonePath
      });
      setCloneUrl("");
      setClonePath("");
      setError("");
    } catch (err) {
      setError(`Failed to clone repository: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const createStash = async () => {
    if (!stashMessage.trim()) {
      setError("Stash message is required");
      return;
    }

    try {
      await invoke("create_stash", {
        repoPath,
        message: stashMessage,
        authorName,
        authorEmail
      });
      setStashMessage("");
      await loadRepositoryData(repoPath);
    } catch (err) {
      setError(`Failed to create stash: ${err}`);
    }
  };

  const applyStash = async (index: number) => {
    try {
      await invoke("apply_stash", {
        repoPath,
        index
      });
      await loadRepositoryData(repoPath);
    } catch (err) {
      setError(`Failed to apply stash: ${err}`);
    }
  };

  const dropStash = async (index: number) => {
    try {
      await invoke("drop_stash", {
        repoPath,
        index
      });
      await loadRepositoryData(repoPath);
    } catch (err) {
      setError(`Failed to drop stash: ${err}`);
    }
  };

  const mergeBranch = async (branchName: string) => {
    try {
      setLoading(true);
      await invoke("merge_branch", {
        repoPath,
        branchName,
        authorName,
        authorEmail
      });
      await loadRepositoryData(repoPath);
      setError("");
    } catch (err) {
      setError(`Failed to merge branch: ${err}`);
      // Reload to check for conflicts
      await loadRepositoryData(repoPath);
    } finally {
      setLoading(false);
    }
  };

  const resolveConflict = async (conflict: MergeConflict, resolution: string) => {
    try {
      await invoke("resolve_conflict", {
        repoPath,
        filePath: conflict.file_path,
        resolution
      });
      await loadRepositoryData(repoPath);
      setSelectedConflict(null);
    } catch (err) {
      setError(`Failed to resolve conflict: ${err}`);
    }
  };

  const cherryPickCommit = async (commitId: string) => {
    try {
      setLoading(true);
      await invoke("cherry_pick_commit", {
        repoPath,
        commitId,
        authorName,
        authorEmail
      });
      await loadRepositoryData(repoPath);
      setError("");
    } catch (err) {
      setError(`Failed to cherry-pick commit: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const rebaseBranch = async (ontoBranch: string) => {
    try {
      setLoading(true);
      await invoke("rebase_interactive", {
        repoPath,
        ontoBranch
      });
      await loadRepositoryData(repoPath);
      setError("");
    } catch (err) {
      setError(`Failed to rebase: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const resetToCommit = async (commitId: string, resetType: string) => {
    try {
      setLoading(true);
      await invoke("reset_to_commit", {
        repoPath,
        commitId,
        resetType
      });
      await loadRepositoryData(repoPath);
      setError("");
    } catch (err) {
      setError(`Failed to reset: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Interactive Rebase functions
  const startInteractiveRebase = async (fromCommit: string, ontoBranch: string) => {
    try {
      setLoading(true);
      const plan = await invoke<RebasePlan>("prepare_interactive_rebase", {
        repoPath,
        ontoBranch,
        fromCommit
      });
      setRebasePlan(plan);
      setIsRebaseMode(true);
      setActiveTab("rebase");
      setError("");
    } catch (err) {
      setError(`Failed to prepare rebase: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const executeRebase = async () => {
    if (!rebasePlan) return;
    
    try {
      setLoading(true);
      await invoke("execute_interactive_rebase", {
        repoPath,
        rebasePlan,
        authorName,
        authorEmail
      });
      setRebasePlan(null);
      setIsRebaseMode(false);
      setActiveTab("commits");
      await loadRepositoryData(repoPath);
      setError("");
    } catch (err) {
      setError(`Failed to execute rebase: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const cancelRebase = () => {
    setRebasePlan(null);
    setIsRebaseMode(false);
    setActiveTab("commits");
  };

  const updateRebaseCommitAction = (commitId: string, action: 'Pick' | 'Squash' | 'Edit' | 'Reword' | 'Drop') => {
    if (!rebasePlan) return;
    
    const updatedCommits = rebasePlan.commits.map(commit =>
      commit.id === commitId ? { ...commit, action } : commit
    );
    
    setRebasePlan({ ...rebasePlan, commits: updatedCommits });
  };

  const updateRebaseCommitMessage = (commitId: string, message: string) => {
    if (!rebasePlan) return;
    
    const updatedCommits = rebasePlan.commits.map(commit =>
      commit.id === commitId ? { ...commit, message } : commit
    );
    
    setRebasePlan({ ...rebasePlan, commits: updatedCommits });
  };

  const reorderRebaseCommits = (fromIndex: number, toIndex: number) => {
    if (!rebasePlan) return;
    
    const commits = [...rebasePlan.commits];
    const [removed] = commits.splice(fromIndex, 1);
    commits.splice(toIndex, 0, removed);
    
    setRebasePlan({ ...rebasePlan, commits });
  };

  // Drag and drop handlers for rebase commits
  const handleRebaseCommitDragStart = (e: React.DragEvent, commit: RebaseCommit, index: number) => {
    setDraggedRebaseCommit(commit);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleRebaseCommitDragEnd = () => {
    setDraggedRebaseCommit(null);
  };

  const handleRebaseCommitDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (sourceIndex !== targetIndex) {
      reorderRebaseCommits(sourceIndex, targetIndex);
    }
    
    setDraggedRebaseCommit(null);
  };

  // Submodule functions
  const addSubmodule = async () => {
    if (!newSubmoduleUrl.trim() || !newSubmodulePath.trim()) {
      setError("Submodule URL and path are required");
      return;
    }

    try {
      setLoading(true);
      await invoke("add_submodule", {
        repoPath,
        url: newSubmoduleUrl,
        path: newSubmodulePath,
        branch: newSubmoduleBranch.trim() || null
      });
      setNewSubmoduleUrl("");
      setNewSubmodulePath("");  
      setNewSubmoduleBranch("");
      await loadRepositoryData(repoPath);
      setError("");
    } catch (err) {
      setError(`Failed to add submodule: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const updateSubmodule = async (submoduleName: string, recursive: boolean = false) => {
    try {
      setLoading(true);
      await invoke("update_submodule", {
        repoPath,
        submoduleName,
        recursive
      });
      await loadRepositoryData(repoPath);
      setError("");
    } catch (err) {
      setError(`Failed to update submodule: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const removeSubmodule = async (submoduleName: string) => {
    try {
      setLoading(true);
      await invoke("remove_submodule", {
        repoPath,
        submoduleName
      });
      await loadRepositoryData(repoPath);
      setError("");
    } catch (err) {
      setError(`Failed to remove submodule: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const initSubmodule = async (submoduleName: string) => {
    try {
      setLoading(true);
      await invoke("init_submodule", {
        repoPath,
        submoduleName
      });
      await loadRepositoryData(repoPath);
      setError("");
    } catch (err) {
      setError(`Failed to initialize submodule: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const syncSubmodule = async (submoduleName: string) => {
    try {
      setLoading(true);
      await invoke("sync_submodule", {
        repoPath,
        submoduleName
      });
      await loadRepositoryData(repoPath);
      setError("");
    } catch (err) {
      setError(`Failed to sync submodule: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, filePath: string) => {
    setDraggedFile(filePath);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', filePath);
  };

  const handleDragEnd = () => {
    setDraggedFile(null);
    setDragOverZone(null);
  };

  const handleDragOver = (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverZone(zone);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the drop zone completely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverZone(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetZone: string) => {
    e.preventDefault();
    const filePath = e.dataTransfer.getData('text/plain');
    
    if (!filePath || !status) return;
    
    // Determine current status of the file
    let currentZone = '';
    if (status.modified.includes(filePath)) currentZone = 'modified';
    else if (status.added.includes(filePath)) currentZone = 'staged';
    else if (status.untracked.includes(filePath)) currentZone = 'untracked';
    else if (status.deleted.includes(filePath)) currentZone = 'deleted';
    
    // Handle the drop action based on source and target zones
    try {
      if (targetZone === 'staged' && currentZone !== 'staged') {
        await stageFile(filePath);
      } else if (targetZone === 'unstaged' && currentZone === 'staged') {
        await unstageFile(filePath);
      }
    } catch (err) {
      setError(`Failed to move file: ${err}`);
    }
    
    setDraggedFile(null);
    setDragOverZone(null);
  };

  const getTotalChanges = () => {
    if (!status) return 0;
    return status.modified.length + status.added.length + status.deleted.length + status.untracked.length;
  };

  const getCurrentBranch = () => {
    return branches.find(b => b.is_head)?.name || "unknown";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container">
      <header className="header">
        <h1>CodeGit</h1>
        {selectedRepo && !showRepoSelection && (
          <div className="current-repo-info">
            <span className="repo-icon">📁</span>
            <span className="repo-name">{selectedRepo.name}</span>
            <span className="branch-icon">🔀</span>
            <span className="current-branch">{selectedBranch || selectedRepo.current_branch}</span>
            <button 
              onClick={() => setShowRepoSelection(true)} 
              className="change-repo-btn"
              title="Change Repository"
            >
              ↩
            </button>
          </div>
        )}
      </header>

      {/* Dashboard - Repository Selection */}
      {showRepoSelection && (
        <div className="dashboard">
          <div className="dashboard-header">
            <h2>Select Repository</h2>
            <button onClick={loadRepositories} className="refresh-btn" disabled={loading}>
              {loading ? "Loading..." : "🔄 Refresh"}
            </button>
            <button onClick={openRepository} className="open-repo-btn">
              📂 Browse for Repository
            </button>
          </div>

          {loading && <div className="loading">Discovering repositories...</div>}
          
          {repositories.length > 0 ? (
            <div className="repositories-grid">
              {repositories.map((repo, index) => (
                <div 
                  key={index} 
                  className={`repository-card ${repo.is_dirty ? 'dirty' : 'clean'}`}
                  onClick={() => selectRepository(repo)}
                >
                  <div className="repo-header">
                    <h3 className="repo-name">{repo.name}</h3>
                    <div className="repo-status">
                      {repo.is_dirty ? (
                        <span className="status-dirty">●</span>
                      ) : (
                        <span className="status-clean">●</span>
                      )}
                    </div>
                  </div>
                  <div className="repo-details">
                    <div className="repo-branch">
                      <span className="label">Branch:</span>
                      <span className="value">{repo.current_branch}</span>
                    </div>
                    <div className="repo-commit">
                      <span className="label">Last commit:</span>
                      <span className="value">{repo.last_commit}</span>
                    </div>
                    <div className="repo-path">
                      <span className="label">Path:</span>
                      <span className="value" title={repo.path}>
                        {repo.path.length > 50 ? '...' + repo.path.slice(-50) : repo.path}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && (
            <div className="no-repositories">
              <h3>No Git repositories found</h3>
              <p>We searched in common directories like Documents, Desktop, Projects, and Developer.</p>
              <button onClick={openRepository} className="browse-btn">
                Browse for Repository
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="error">
          <button onClick={() => setError("")} className="close-error">×</button>
          {error}
        </div>
      )}

      {loading && (
        <div className="loading">
          Loading repository data...
        </div>
      )}

      {selectedRepo && !showRepoSelection && (
        <div className="tabs">
          <button 
            className={`tab ${activeTab === "status" ? "active" : ""}`}
            onClick={() => setActiveTab("status")}
          >
            Status {status && getTotalChanges() > 0 && `(${getTotalChanges()})`}
          </button>
          <button 
            className={`tab ${activeTab === "commits" ? "active" : ""}`}
            onClick={() => setActiveTab("commits")}
          >
            Commits ({commits.length})
          </button>
          <button 
            className={`tab ${activeTab === "branches" ? "active" : ""}`}
            onClick={() => setActiveTab("branches")}
          >
            Branches ({detailedBranches.length})
          </button>
          <button 
            className={`tab ${activeTab === "remotes" ? "active" : ""}`}
            onClick={() => setActiveTab("remotes")}
          >
            Remotes ({remotes.length})
          </button>
          <button 
            className={`tab ${activeTab === "stash" ? "active" : ""}`}
            onClick={() => setActiveTab("stash")}
          >
            Stash ({stashes.length})
          </button>
          {conflicts.length > 0 && (
            <button 
              className={`tab ${activeTab === "conflicts" ? "active" : ""} conflicts-tab`}
              onClick={() => setActiveTab("conflicts")}
            >
              Conflicts ({conflicts.length})
            </button>
          )}
          <button 
            className={`tab ${activeTab === "graph" ? "active" : ""}`}
            onClick={() => setActiveTab("graph")}
          >
            Graph
          </button>
          <button 
            className={`tab ${activeTab === "submodules" ? "active" : ""}`}
            onClick={() => setActiveTab("submodules")}
          >
            Submodules ({submodules.length})
          </button>
          {isRebaseMode && (
            <button 
              className={`tab ${activeTab === "rebase" ? "active" : ""} rebase-tab`}
              onClick={() => setActiveTab("rebase")}
            >
              Interactive Rebase ({rebasePlan?.commits.length || 0})
            </button>
          )}
          <button 
            className={`tab ${activeTab === "files" ? "active" : ""}`}
            onClick={() => setActiveTab("files")}
          >
            Files
          </button>
          {selectedFile && (
            <button 
              className={`tab ${activeTab === "diff" ? "active" : ""}`}
              onClick={() => setActiveTab("diff")}
            >
              Diff: {selectedFile}
            </button>
          )}
        </div>
      )}

      {activeTab === "status" && status && (
        <div className="status-section">
          <div className="commit-form">
            <h3>Commit Changes</h3>
            <div className="form-group">
              <input
                type="text"
                placeholder="Author Name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
              />
              <input
                type="email"
                placeholder="Author Email"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
              />
            </div>
            <textarea
              placeholder="Commit message..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={3}
            />
            <button 
              onClick={commitChanges} 
              className="commit-btn"
              disabled={!commitMessage.trim()}
            >
              Commit Changes
            </button>
          </div>

          <h2>Repository Status ({getTotalChanges()} changes)</h2>
          <div className="drag-instructions">
            <p>💡 <strong>Tip:</strong> Drag files between sections to stage/unstage them</p>
          </div>
          <div className="status-grid">
            <div 
              className={`status-group modified ${dragOverZone === 'staged' && draggedFile && status.modified.includes(draggedFile) ? 'drag-source' : ''}`}
              onDragOver={(e) => handleDragOver(e, 'staged')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'staged')}
            >
              <h3>Modified ({status.modified.length}) {dragOverZone === 'staged' ? '← Drop to stage' : ''}</h3>
              <ul>
                {status.modified.map((file, index) => (
                  <li 
                    key={index} 
                    className={`file-item ${draggedFile === file ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="file-name drag-handle">📁 {file}</span>
                    <div className="file-actions">
                      <button onClick={() => viewFileDiff(file)} className="action-btn">Diff</button>
                      <button onClick={() => stageFile(file)} className="action-btn stage">Stage</button>
                    </div>
                  </li>
                ))}
                {status.modified.length === 0 && (
                  <li className="drop-zone-placeholder">
                    <span>Drag modified files here</span>
                  </li>
                )}
              </ul>
            </div>
            
            <div 
              className={`status-group added ${dragOverZone === 'unstaged' && draggedFile && status.added.includes(draggedFile) ? 'drag-source' : ''}`}
              onDragOver={(e) => handleDragOver(e, 'unstaged')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'unstaged')}
            >
              <h3>Staged ({status.added.length}) {dragOverZone === 'unstaged' ? '← Drop to unstage' : ''}</h3>
              <ul>
                {status.added.map((file, index) => (
                  <li 
                    key={index} 
                    className={`file-item ${draggedFile === file ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="file-name drag-handle">✅ {file}</span>
                    <div className="file-actions">
                      <button onClick={() => unstageFile(file)} className="action-btn unstage">Unstage</button>
                    </div>
                  </li>
                ))}
                {status.added.length === 0 && (
                  <li className="drop-zone-placeholder">
                    <span>Drag files here to stage</span>
                  </li>
                )}
              </ul>
            </div>
            
            <div 
              className={`status-group untracked ${dragOverZone === 'staged' && draggedFile && status.untracked.includes(draggedFile) ? 'drag-source' : ''}`}
              onDragOver={(e) => handleDragOver(e, 'staged')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'staged')}
            >
              <h3>Untracked ({status.untracked.length}) {dragOverZone === 'staged' ? '← Drop to stage' : ''}</h3>
              <ul>
                {status.untracked.map((file, index) => (
                  <li 
                    key={index} 
                    className={`file-item ${draggedFile === file ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="file-name drag-handle">❓ {file}</span>
                    <div className="file-actions">
                      <button onClick={() => stageFile(file)} className="action-btn stage">Stage</button>
                    </div>
                  </li>
                ))}
                {status.untracked.length === 0 && (
                  <li className="drop-zone-placeholder">
                    <span>Drag untracked files here</span>
                  </li>
                )}
              </ul>
            </div>
            
            <div 
              className={`status-group deleted ${dragOverZone === 'staged' && draggedFile && status.deleted.includes(draggedFile) ? 'drag-source' : ''}`}
              onDragOver={(e) => handleDragOver(e, 'staged')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'staged')}
            >
              <h3>Deleted ({status.deleted.length}) {dragOverZone === 'staged' ? '← Drop to stage' : ''}</h3>
              <ul>
                {status.deleted.map((file, index) => (
                  <li 
                    key={index} 
                    className={`file-item ${draggedFile === file ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="file-name drag-handle">❌ {file}</span>
                    <div className="file-actions">
                      <button onClick={() => stageFile(file)} className="action-btn stage">Stage</button>
                    </div>
                  </li>
                ))}
                {status.deleted.length === 0 && (
                  <li className="drop-zone-placeholder">
                    <span>Drag deleted files here</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === "commits" && commits.length > 0 && (
        <div className="commits-section">
          <h2>Recent Commits ({commits.length})</h2>
          <div className="commits-list">
            {commits.map((commit) => (
              <div key={commit.id} className="commit-item">
                <div className="commit-header">
                  <span className="commit-id">{commit.id.substring(0, 8)}</span>
                  <span className="commit-author">{commit.author}</span>
                  <span className="commit-date">{formatDate(commit.timestamp)}</span>
                </div>
                <div className="commit-message">{commit.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "branches" && (
        <div className="branches-section">
          <div className="branch-form">
            <h3>Create New Branch</h3>
            <div className="form-group">
              <input
                type="text"
                placeholder="Branch name..."
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
              />
              <button onClick={createBranch} className="create-branch-btn">
                Create Branch
              </button>
            </div>
          </div>

          <h2>Branches ({branches.length})</h2>
          <div className="branches-list">
            {branches.map((branch, index) => (
              <div key={index} className={`branch-item ${branch.is_head ? "current" : ""}`}>
                <div className="branch-info">
                  <span className="branch-name">
                    {branch.is_head && "* "}{branch.name}
                  </span>
                  <span className="branch-type">
                    {branch.is_remote ? "remote" : "local"}
                  </span>
                  {branch.target && (
                    <span className="branch-commit">{branch.target.substring(0, 8)}</span>
                  )}
                </div>
                {!branch.is_head && !branch.is_remote && (
                  <div className="branch-actions">
                    <button 
                      onClick={() => switchBranch(branch.name)}
                      className="switch-branch-btn"
                    >
                      Switch
                    </button>
                    <button 
                      onClick={() => mergeBranch(branch.name)}
                      className="merge-branch-btn"
                    >
                      Merge
                    </button>
                    <button 
                      onClick={() => rebaseBranch(branch.name)}
                      className="rebase-branch-btn"
                    >
                      Rebase
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "remotes" && (
        <div className="remotes-section">
          <div className="clone-form">
            <h3>Clone Repository</h3>
            <div className="form-group">
              <input
                type="text"
                placeholder="Repository URL..."
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
              />
              <input
                type="text"
                placeholder="Local path..."
                value={clonePath}
                onChange={(e) => setClonePath(e.target.value)}
              />
              <button onClick={cloneRepository} className="clone-btn">
                Clone
              </button>
            </div>
          </div>

          <div className="remote-form">
            <h3>Add Remote</h3>
            <div className="form-group">
              <input
                type="text"
                placeholder="Remote name..."
                value={newRemoteName}
                onChange={(e) => setNewRemoteName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Remote URL..."
                value={newRemoteUrl}
                onChange={(e) => setNewRemoteUrl(e.target.value)}
              />
              <button onClick={addRemote} className="add-remote-btn">
                Add Remote
              </button>
            </div>
          </div>

          <h2>Remotes ({remotes.length})</h2>
          <div className="remotes-list">
            {remotes.map((remote, index) => (
              <div key={index} className="remote-item">
                <div className="remote-info">
                  <span className="remote-name">{remote.name}</span>
                  <span className="remote-url">{remote.url}</span>
                </div>
                <div className="remote-actions">
                  <button 
                    onClick={() => fetchFromRemote(remote.name)}
                    className="action-btn fetch"
                  >
                    Fetch
                  </button>
                  <button 
                    onClick={() => pullFromRemote(remote.name, getCurrentBranch())}
                    className="action-btn pull"
                  >
                    Pull
                  </button>
                  <button 
                    onClick={() => pushToRemote(remote.name, getCurrentBranch())}
                    className="action-btn push"
                  >
                    Push
                  </button>
                  <button 
                    onClick={() => removeRemote(remote.name)}
                    className="action-btn remove"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "stash" && (
        <div className="stash-section">
          <div className="stash-form">
            <h3>Create Stash</h3>
            <div className="form-group">
              <input
                type="text"
                placeholder="Stash message..."
                value={stashMessage}
                onChange={(e) => setStashMessage(e.target.value)}
              />
              <button onClick={createStash} className="create-stash-btn">
                Create Stash
              </button>
            </div>
          </div>

          <h2>Stashes ({stashes.length})</h2>
          <div className="stashes-list">
            {stashes.map((stash) => (
              <div key={stash.index} className="stash-item">
                <div className="stash-info">
                  <span className="stash-index">#{stash.index}</span>
                  <span className="stash-message">{stash.message}</span>
                  <span className="stash-author">{stash.author}</span>
                  <span className="stash-date">{formatDate(stash.timestamp)}</span>
                </div>
                <div className="stash-actions">
                  <button 
                    onClick={() => applyStash(stash.index)}
                    className="action-btn apply"
                  >
                    Apply
                  </button>
                  <button 
                    onClick={() => dropStash(stash.index)}
                    className="action-btn drop"
                  >
                    Drop
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "conflicts" && conflicts.length > 0 && (
        <div className="conflicts-section">
          <h2>Merge Conflicts ({conflicts.length})</h2>
          <div className="conflicts-list">
            {conflicts.map((conflict, index) => (
              <div key={index} className="conflict-item">
                <div className="conflict-header">
                  <h3>{conflict.file_path}</h3>
                  <button 
                    onClick={() => setSelectedConflict(conflict)}
                    className="resolve-btn"
                  >
                    Resolve
                  </button>
                </div>
                
                {selectedConflict === conflict && (
                  <div className="conflict-resolution">
                    <div className="conflict-versions">
                      <div className="version ancestor">
                        <h4>Ancestor</h4>
                        <pre>{conflict.ancestor_content}</pre>
                      </div>
                      <div className="version ours">
                        <h4>Ours (Current)</h4>
                        <pre>{conflict.our_content}</pre>
                        <button 
                          onClick={() => resolveConflict(conflict, conflict.our_content)}
                          className="use-version-btn"
                        >
                          Use This Version
                        </button>
                      </div>
                      <div className="version theirs">
                        <h4>Theirs (Incoming)</h4>
                        <pre>{conflict.their_content}</pre>
                        <button 
                          onClick={() => resolveConflict(conflict, conflict.their_content)}
                          className="use-version-btn"
                        >
                          Use This Version
                        </button>
                      </div>
                    </div>
                    
                    <div className="manual-resolution">
                      <h4>Manual Resolution</h4>
                      <textarea
                        value={conflict.resolution || ""}
                        onChange={(e) => {
                          const updatedConflicts = conflicts.map(c => 
                            c === conflict ? { ...c, resolution: e.target.value } : c
                          );
                          setConflicts(updatedConflicts);
                        }}
                        placeholder="Enter your resolution here..."
                        rows={10}
                      />
                      <button 
                        onClick={() => resolveConflict(conflict, conflict.resolution || "")}
                        className="resolve-manual-btn"
                        disabled={!conflict.resolution?.trim()}
                      >
                        Apply Resolution
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "graph" && (
        <div className="graph-section">
          <div className="section-header">
            <h2>Commit Graph ({logEntries.length})</h2>
            {!isRebaseMode && (
              <button 
                onClick={() => {
                  if (logEntries.length > 1) {
                    startInteractiveRebase(logEntries[logEntries.length - 1].id, getCurrentBranch());
                  }
                }}
                className="action-btn rebase-start-btn"
                disabled={logEntries.length <= 1}
              >
                🔄 Start Interactive Rebase
              </button>
            )}
          </div>
          <div className="graph-list">
            {logEntries.map((entry) => (
              <div key={entry.id} className="graph-item">
                <div className="graph-visual">
                  <div className="commit-dot"></div>
                  {entry.parents.length > 1 && <div className="merge-line"></div>}
                </div>
                
                <div className="commit-details">
                  <div className="commit-header">
                    <span className="commit-id">{entry.id.substring(0, 8)}</span>
                    <span className="commit-author">{entry.author}</span>
                    <span className="commit-date">{formatDate(entry.timestamp)}</span>
                    
                    {entry.refs.length > 0 && (
                      <div className="commit-refs">
                        {entry.refs.map((ref, index) => (
                          <span key={index} className="commit-ref">
                            {ref}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="commit-message">{entry.message}</div>
                  
                  <div className="commit-actions">
                    <button 
                      onClick={() => cherryPickCommit(entry.id)}
                      className="action-btn cherry-pick"
                    >
                      Cherry-pick
                    </button>
                    <button 
                      onClick={() => resetToCommit(entry.id, "soft")}
                      className="action-btn reset-soft"
                    >
                      Reset (Soft)
                    </button>
                    <button 
                      onClick={() => resetToCommit(entry.id, "hard")}
                      className="action-btn reset-hard"
                    >
                      Reset (Hard)
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "diff" && fileDiff && (
        <div className="diff-section">
          <h2>Diff: {fileDiff.file_path}</h2>
          <div className="diff-content">
            {fileDiff.hunks.map((hunk, hunkIndex) => (
              <div key={hunkIndex} className="diff-hunk">
                <div className="hunk-header">
                  @@ -{hunk.old_start},{hunk.old_lines} +{hunk.new_start},{hunk.new_lines} @@
                </div>
                <div className="hunk-lines">
                  {hunk.lines.map((line, lineIndex) => (
                    <div 
                      key={lineIndex} 
                      className={`diff-line ${
                        line.origin === '+' ? 'added' : 
                        line.origin === '-' ? 'removed' : 
                        'context'
                      }`}
                    >
                      <span className="line-numbers">
                        <span className="old-line">{line.old_lineno || ""}</span>
                        <span className="new-line">{line.new_lineno || ""}</span>
                      </span>
                      <span className="line-origin">{line.origin}</span>
                      <span className="line-content">{line.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "rebase" && rebasePlan && (
        <div className="rebase-section">
          <div className="rebase-header">
            <h2>Interactive Rebase onto {rebasePlan.onto_branch}</h2>
            <div className="rebase-actions">
              <button onClick={executeRebase} className="action-btn execute-rebase-btn">
                ✅ Execute Rebase
              </button>
              <button onClick={cancelRebase} className="action-btn cancel-rebase-btn">
                ❌ Cancel
              </button>
            </div>
          </div>
          
          <div className="rebase-instructions">
            <p>📝 <strong>Instructions:</strong> Drag commits to reorder, select actions, and edit messages as needed.</p>
            <div className="action-legend">
              <span className="legend-item pick">Pick = Include commit</span>
              <span className="legend-item reword">Reword = Change message</span>
              <span className="legend-item squash">Squash = Combine with previous</span>
              <span className="legend-item drop">Drop = Remove commit</span>
            </div>
          </div>

          <div className="rebase-commits-list">
            {rebasePlan.commits.map((commit, index) => (
              <div 
                key={commit.id} 
                className={`rebase-commit-item ${draggedRebaseCommit?.id === commit.id ? 'dragging' : ''} action-${commit.action.toLowerCase()}`}
                draggable
                onDragStart={(e) => handleRebaseCommitDragStart(e, commit, index)}
                onDragEnd={handleRebaseCommitDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleRebaseCommitDrop(e, index)}
              >
                <div className="rebase-commit-controls">
                  <select 
                    value={commit.action}
                    onChange={(e) => updateRebaseCommitAction(commit.id, e.target.value as any)}
                    className="action-select"
                  >
                    <option value="Pick">Pick</option>
                    <option value="Reword">Reword</option>
                    <option value="Squash">Squash</option>
                    <option value="Drop">Drop</option>
                  </select>
                  
                  <span className="drag-handle">⋮⋮</span>
                </div>
                
                <div className="rebase-commit-info">
                  <div className="commit-header">
                    <span className="commit-id">{commit.id.substring(0, 8)}</span>
                    <span className="commit-author">{commit.author}</span>
                    <span className="commit-date">{formatDate(commit.timestamp)}</span>
                  </div>
                  
                  {commit.action === 'Reword' ? (
                    <textarea
                      value={commit.message}
                      onChange={(e) => updateRebaseCommitMessage(commit.id, e.target.value)}
                      className="reword-textarea"
                      rows={2}
                      placeholder="Enter new commit message..."
                    />
                  ) : (
                    <div className="commit-message">{commit.message}</div>
                  )}
                </div>
                
                {commit.action === 'Drop' && (
                  <div className="drop-overlay">
                    <span>❌ This commit will be dropped</span>
                  </div>
                )}
                
                {commit.action === 'Squash' && index > 0 && (
                  <div className="squash-indicator">
                    <span>⬆️ Will be squashed with previous commit</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "submodules" && (
        <div className="submodules-section">
          <div className="submodule-form">
            <h3>Add Submodule</h3>
            <div className="form-group">
              <input
                type="text"
                placeholder="Repository URL..."
                value={newSubmoduleUrl}
                onChange={(e) => setNewSubmoduleUrl(e.target.value)}
              />
              <input
                type="text"
                placeholder="Local path..."
                value={newSubmodulePath}
                onChange={(e) => setNewSubmodulePath(e.target.value)}
              />
              <input
                type="text"
                placeholder="Branch (optional)..."
                value={newSubmoduleBranch}
                onChange={(e) => setNewSubmoduleBranch(e.target.value)}
              />
              <button onClick={addSubmodule} className="add-submodule-btn">
                Add Submodule
              </button>
            </div>
          </div>

          <h2>Submodules ({submodules.length})</h2>
          {submodules.length === 0 ? (
            <div className="empty-state">
              <p>📦 No submodules found in this repository.</p>
              <p>Add a submodule using the form above to include external repositories.</p>
            </div>
          ) : (
            <div className="submodules-list">
              {submodules.map((submodule, index) => (
                <div key={index} className={`submodule-item status-${submodule.status.toLowerCase()}`}>
                  <div className="submodule-info">
                    <div className="submodule-header">
                      <span className="submodule-name">{submodule.name}</span>
                      <span className={`status-badge ${submodule.status.toLowerCase()}`}>
                        {submodule.status}
                      </span>
                    </div>
                    
                    <div className="submodule-details">
                      <div className="detail-row">
                        <span className="label">Path:</span>
                        <span className="value">{submodule.path}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">URL:</span>
                        <span className="value url">{submodule.url}</span>
                      </div>
                      {submodule.branch && (
                        <div className="detail-row">
                          <span className="label">Branch:</span>
                          <span className="value">{submodule.branch}</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="label">HEAD:</span>
                        <span className="value commit-id">{submodule.head_id.substring(0, 8)}</span>
                      </div>
                      {submodule.workdir_id && (
                        <div className="detail-row">
                          <span className="label">Working Dir:</span>
                          <span className="value commit-id">{submodule.workdir_id.substring(0, 8)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="submodule-actions">
                    {submodule.status === 'Uninitialized' && (
                      <button 
                        onClick={() => initSubmodule(submodule.name)}
                        className="action-btn init"
                      >
                        Initialize
                      </button>
                    )}
                    
                    {submodule.status !== 'Uninitialized' && (
                      <>
                        <button 
                          onClick={() => updateSubmodule(submodule.name, false)}
                          className="action-btn update"
                        >
                          Update
                        </button>
                        <button 
                          onClick={() => updateSubmodule(submodule.name, true)}
                          className="action-btn update-recursive"
                        >
                          Update (Recursive)
                        </button>
                        <button 
                          onClick={() => syncSubmodule(submodule.name)}
                          className="action-btn sync"
                        >
                          Sync
                        </button>
                      </>
                    )}
                    
                    <button 
                      onClick={() => removeSubmodule(submodule.name)}
                      className="action-btn remove"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "files" && status && (
        <div className="files-section">
          <div className="files-browser">
            <h3>Repository Files</h3>
            <div className="files-grid">
              <div className="file-list">
                <h4>Modified Files ({status.modified.length})</h4>
                {status.modified.map((file, index) => (
                  <div key={index} className="file-item modified" onClick={() => loadFileContent(file)}>
                    <span className="file-status">M</span>
                    <span className="file-name">{file}</span>
                  </div>
                ))}
                
                <h4>Added Files ({status.added.length})</h4>
                {status.added.map((file, index) => (
                  <div key={index} className="file-item added" onClick={() => loadFileContent(file)}>
                    <span className="file-status">A</span>
                    <span className="file-name">{file}</span>
                  </div>
                ))}
                
                <h4>Untracked Files ({status.untracked.length})</h4>
                {status.untracked.map((file, index) => (
                  <div key={index} className="file-item untracked" onClick={() => loadFileContent(file)}>
                    <span className="file-status">?</span>
                    <span className="file-name">{file}</span>
                  </div>
                ))}
                
                {status.deleted.length > 0 && (
                  <>
                    <h4>Deleted Files ({status.deleted.length})</h4>
                    {status.deleted.map((file, index) => (
                      <div key={index} className="file-item deleted">
                        <span className="file-status">D</span>
                        <span className="file-name">{file}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
              
              <div className="file-content">
                {fileContent ? (
                  <div className="content-viewer">
                    <div className="content-header">
                      <h4>{fileContent.path}</h4>
                      <div className="content-info">
                        <span>Size: {formatFileSize(fileContent.size)}</span>
                        {fileContent.is_binary && <span className="binary-label">Binary</span>}
                      </div>
                    </div>
                    <div className="content-body">
                      {fileContent.is_binary ? (
                        <div className="binary-content">
                          <p>Binary file - cannot display content</p>
                          <p>{fileContent.content}</p>
                        </div>
                      ) : (
                        <pre className="code-content">{fileContent.content}</pre>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="no-file-selected">
                    <p>Select a file to view its content</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;