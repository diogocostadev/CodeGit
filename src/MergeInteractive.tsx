import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./MergeInteractive.css";

interface RepositoryInfo {
  name: string;
  path: string;
  current_branch: string;
  last_commit: string;
  is_dirty: boolean;
  last_accessed: number;
}

interface GitBranch {
  name: string;
  is_head: boolean;
  is_remote: boolean;
  target?: string;
}

interface GitCommit {
  id: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  branch?: string;
}

interface ConflictFile {
  path: string;
  reason: string;
}

interface MergePreview {
  operation: 'merge' | 'rebase' | 'cherry-pick';
  sourceBranch: string;
  targetBranch: string;
  selectedCommits: GitCommit[];
  hasConflicts: boolean;
  conflictFiles: ConflictFile[];
  description: string;
}

type Operation = 'merge' | 'rebase' | 'cherry-pick';

interface MergeInteractiveProps {
  repository: RepositoryInfo;
  onNavigate: (screen: string) => void;
}

const MergeInteractive: React.FC<MergeInteractiveProps> = ({ repository, onNavigate }) => {
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [sourceBranch, setSourceBranch] = useState<string>('');
  const [targetBranch, setTargetBranch] = useState<string>('');
  const [sourceCommits, setSourceCommits] = useState<GitCommit[]>([]);
  const [targetCommits, setTargetCommits] = useState<GitCommit[]>([]);
  const [selectedCommits, setSelectedCommits] = useState<GitCommit[]>([]);
  const [currentOperation, setCurrentOperation] = useState<Operation>('merge');
  const [draggedCommit, setDraggedCommit] = useState<GitCommit | null>(null);
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);
  const [loading, setLoading] = useState(true);

  const targetPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (repository) {
      loadBranches();
    }
  }, [repository]);

  useEffect(() => {
    if (sourceBranch) {
      loadBranchCommits(sourceBranch, 'source');
    }
  }, [sourceBranch]);

  useEffect(() => {
    if (targetBranch) {
      loadBranchCommits(targetBranch, 'target');
    }
  }, [targetBranch]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const branchList = await invoke<GitBranch[]>("get_branches", {
        repoPath: repository.path
      });
      
      setBranches(branchList);
      
      // Set default branches
      const currentBranch = branchList.find(b => b.is_head);
      const otherBranches = branchList.filter(b => !b.is_head && !b.is_remote);
      
      if (currentBranch) {
        setTargetBranch(currentBranch.name);
      }
      
      if (otherBranches.length > 0) {
        setSourceBranch(otherBranches[0].name);
      }
    } catch (error) {
      console.error("Failed to load branches:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBranchCommits = async (branch: string, type: 'source' | 'target') => {
    try {
      // Simular carregamento de commits da branch
      const mockCommits: GitCommit[] = generateMockCommits(branch, type);
      
      if (type === 'source') {
        setSourceCommits(mockCommits);
      } else {
        setTargetCommits(mockCommits);
      }
    } catch (error) {
      console.error(`Failed to load ${type} commits:`, error);
    }
  };

  const generateMockCommits = (branch: string, type: 'source' | 'target'): GitCommit[] => {
    const baseCommits = [
      { id: '1a2b3c4', message: 'Initial commit', author: 'John Doe', email: 'john@example.com' },
      { id: '2b3c4d5', message: 'Add authentication system', author: 'Jane Smith', email: 'jane@example.com' },
      { id: '3c4d5e6', message: 'Fix login validation', author: 'John Doe', email: 'john@example.com' },
      { id: '4d5e6f7', message: 'Update dependencies', author: 'Bob Wilson', email: 'bob@example.com' },
      { id: '5e6f7g8', message: 'Improve error handling', author: 'Alice Brown', email: 'alice@example.com' }
    ];

    if (type === 'source') {
      return [
        ...baseCommits,
        { id: '6f7g8h9', message: 'Add new feature X', author: 'John Doe', email: 'john@example.com' },
        { id: '7g8h9i0', message: 'Implement feature X tests', author: 'Jane Smith', email: 'jane@example.com' },
        { id: '8h9i0j1', message: 'Refactor feature X code', author: 'John Doe', email: 'john@example.com' }
      ].map((commit, index) => ({
        ...commit,
        timestamp: Date.now() / 1000 - (8 - index) * 3600,
        branch
      }));
    } else {
      return [
        ...baseCommits,
        { id: '9i0j1k2', message: 'Fix critical bug in main', author: 'Alice Brown', email: 'alice@example.com' },
        { id: '0j1k2l3', message: 'Update main documentation', author: 'Bob Wilson', email: 'bob@example.com' }
      ].map((commit, index) => ({
        ...commit,
        timestamp: Date.now() / 1000 - (7 - index) * 3600,
        branch
      }));
    }
  };

  const handleDragStart = (e: React.DragEvent, commit: GitCommit) => {
    setDraggedCommit(commit);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', commit.id);
    
    // Add visual feedback
    const target = e.target as HTMLElement;
    target.classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedCommit(null);
    setIsDropZoneActive(false);
    
    // Remove visual feedback
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropZoneActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only hide drop zone if leaving the panel entirely
    const rect = targetPanelRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (clientX < rect.left || clientX > rect.right || 
          clientY < rect.top || clientY > rect.bottom) {
        setIsDropZoneActive(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropZoneActive(false);
    
    if (draggedCommit) {
      // Add commit to selection if not already selected
      if (!selectedCommits.find(c => c.id === draggedCommit.id)) {
        const newSelection = [...selectedCommits, draggedCommit];
        setSelectedCommits(newSelection);
        generateMergePreview(newSelection);
      }
    }
  };

  const generateMergePreview = (commits: GitCommit[]) => {
    if (commits.length === 0 || !sourceBranch || !targetBranch) {
      setMergePreview(null);
      return;
    }

    // Simulate conflict detection
    const hasConflicts = Math.random() > 0.7; // 30% chance of conflicts
    const conflictFiles: ConflictFile[] = hasConflicts ? [
      { path: 'src/components/Auth.tsx', reason: 'Conflicting imports' },
      { path: 'package.json', reason: 'Different dependency versions' }
    ] : [];

    const operationDescriptions = {
      merge: `Merge ${commits.length} commit(s) from ${sourceBranch} into ${targetBranch}`,
      rebase: `Rebase ${commits.length} commit(s) from ${sourceBranch} onto ${targetBranch}`,
      'cherry-pick': `Cherry-pick ${commits.length} commit(s) from ${sourceBranch} to ${targetBranch}`
    };

    const preview: MergePreview = {
      operation: currentOperation,
      sourceBranch,
      targetBranch,
      selectedCommits: commits,
      hasConflicts,
      conflictFiles,
      description: operationDescriptions[currentOperation]
    };

    setMergePreview(preview);
  };

  const handleCommitSelect = (commit: GitCommit) => {
    const isSelected = selectedCommits.find(c => c.id === commit.id);
    let newSelection: GitCommit[];
    
    if (isSelected) {
      newSelection = selectedCommits.filter(c => c.id !== commit.id);
    } else {
      newSelection = [...selectedCommits, commit];
    }
    
    setSelectedCommits(newSelection);
    generateMergePreview(newSelection);
  };

  const executeOperation = async () => {
    if (!mergePreview) return;

    try {
      console.log(`Executing ${mergePreview.operation}:`, {
        source: mergePreview.sourceBranch,
        target: mergePreview.targetBranch,
        commits: mergePreview.selectedCommits.map(c => c.id)
      });

      if (mergePreview.hasConflicts) {
        // Navigate to conflict resolution
        onNavigate('conflicts');
      } else {
        // Show success and refresh
        setMergePreview(null);
        setSelectedCommits([]);
        await loadBranches();
      }
    } catch (error) {
      console.error(`Failed to execute ${mergePreview.operation}:`, error);
    }
  };

  const cancelOperation = () => {
    setMergePreview(null);
    setSelectedCommits([]);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "agora";
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getCommitType = (message: string) => {
    if (message.toLowerCase().includes('merge')) return 'merge';
    if (message.toLowerCase().includes('feat') || message.toLowerCase().includes('feature')) return 'feature';
    return 'normal';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const localBranches = branches.filter(b => !b.is_remote);

  return (
    <div className="merge-interactive-container">
      {/* Header */}
      <div className="merge-header">
        <div className="merge-title-section">
          <button className="merge-back-btn" onClick={() => onNavigate("commits")}>
            ← Voltar
          </button>
          <div className="merge-title-info">
            <div className="merge-title">Merge Interativo</div>
            <div className="merge-subtitle">
              <span>🏛️ {repository.name}</span>
              <span>•</span>
              <span>Operações Git visuais</span>
            </div>
          </div>
        </div>

        <div className="merge-actions">
          <div className="operation-selector">
            <button 
              className={`operation-btn ${currentOperation === 'merge' ? 'active' : ''}`}
              onClick={() => setCurrentOperation('merge')}
            >
              🔀 Merge
            </button>
            <button 
              className={`operation-btn ${currentOperation === 'rebase' ? 'active' : ''}`}
              onClick={() => setCurrentOperation('rebase')}
            >
              📝 Rebase
            </button>
            <button 
              className={`operation-btn ${currentOperation === 'cherry-pick' ? 'active' : ''}`}
              onClick={() => setCurrentOperation('cherry-pick')}
            >
              🍒 Cherry-pick
            </button>
          </div>

          <button 
            className={`execute-btn ${mergePreview ? 'ready' : ''}`}
            onClick={executeOperation}
            disabled={!mergePreview}
          >
            ✨ Executar {currentOperation}
          </button>

          <button className="cancel-btn" onClick={cancelOperation}>
            ✕ Cancelar
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="merge-main">
        {/* Source branch panel */}
        <div className="branch-panel source">
          <div className="branch-header">
            <div className="branch-info">
              <div className="branch-icon source">S</div>
              <div className="branch-details">
                <div className="branch-name">
                  Branch Origem
                </div>
                <div className="branch-stats">
                  <span>{sourceCommits.length} commits</span>
                  <span>•</span>
                  <span>{selectedCommits.length} selecionados</span>
                </div>
              </div>
            </div>
            <select 
              className="branch-selector"
              value={sourceBranch}
              onChange={(e) => setSourceBranch(e.target.value)}
            >
              <option value="">Selecionar branch...</option>
              {localBranches.map(branch => (
                <option key={branch.name} value={branch.name}>
                  {branch.name} {branch.is_head ? '(atual)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="commits-list">
            {loading ? (
              <div className="loading-merge">Carregando commits...</div>
            ) : sourceCommits.length === 0 ? (
              <div className="helper-text visible">
                <div className="helper-icon">📋</div>
                <div className="helper-title">Selecione uma branch origem</div>
                <div className="helper-description">
                  Escolha a branch de onde você quer fazer merge/rebase
                </div>
              </div>
            ) : (
              sourceCommits.map((commit) => (
                <div
                  key={commit.id}
                  className={`commit-item ${selectedCommits.find(c => c.id === commit.id) ? 'selected' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, commit)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleCommitSelect(commit)}
                >
                  <div className={`commit-dot-merge ${getCommitType(commit.message)}`}></div>
                  <div className="commit-info-merge">
                    <div className="commit-message-merge">{commit.message}</div>
                    <div className="commit-meta-merge">
                      <div className="commit-author-merge">
                        <div className="author-initial">{getInitials(commit.author)}</div>
                        {commit.author}
                      </div>
                      <div className="commit-hash-merge">{commit.id}</div>
                      <div>{formatDate(commit.timestamp)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Target branch panel */}
        <div 
          className="branch-panel target"
          ref={targetPanelRef}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="branch-header">
            <div className="branch-info">
              <div className="branch-icon target">T</div>
              <div className="branch-details">
                <div className="branch-name">
                  Branch Destino
                </div>
                <div className="branch-stats">
                  <span>{targetCommits.length} commits</span>
                  <span>•</span>
                  <span>Recebendo {currentOperation}</span>
                </div>
              </div>
            </div>
            <select 
              className="branch-selector"
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
            >
              <option value="">Selecionar branch...</option>
              {localBranches.map(branch => (
                <option key={branch.name} value={branch.name}>
                  {branch.name} {branch.is_head ? '(atual)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="commits-list">
            {loading ? (
              <div className="loading-merge">Carregando commits...</div>
            ) : targetCommits.length === 0 ? (
              <div className="helper-text visible">
                <div className="helper-icon">🎯</div>
                <div className="helper-title">Selecione uma branch destino</div>
                <div className="helper-description">
                  Escolha a branch que vai receber as mudanças
                </div>
              </div>
            ) : (
              targetCommits.map((commit) => (
                <div key={commit.id} className="commit-item">
                  <div className={`commit-dot-merge ${getCommitType(commit.message)}`}></div>
                  <div className="commit-info-merge">
                    <div className="commit-message-merge">{commit.message}</div>
                    <div className="commit-meta-merge">
                      <div className="commit-author-merge">
                        <div className="author-initial">{getInitials(commit.author)}</div>
                        {commit.author}
                      </div>
                      <div className="commit-hash-merge">{commit.id}</div>
                      <div>{formatDate(commit.timestamp)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drop zone overlay */}
          <div className={`drop-zone ${isDropZoneActive ? 'active' : ''}`}>
            <div className="drop-zone-icon">🎯</div>
            <div className="drop-zone-text">Solte aqui para {currentOperation}</div>
            <div className="drop-zone-hint">
              Os commits serão {currentOperation === 'merge' ? 'merged' : 
                               currentOperation === 'rebase' ? 'rebased' : 'cherry-picked'} 
              {' '}para esta branch
            </div>
          </div>
        </div>
      </div>

      {/* Operation Preview */}
      {mergePreview && (
        <div className="operation-preview visible">
          <div className="preview-header">
            <div className="preview-icon">
              {currentOperation === 'merge' ? '🔀' : 
               currentOperation === 'rebase' ? '📝' : '🍒'}
            </div>
            <div className="preview-title">
              {currentOperation === 'merge' ? 'Preview do Merge' :
               currentOperation === 'rebase' ? 'Preview do Rebase' : 'Preview do Cherry-pick'}
            </div>
          </div>

          <div className="preview-description">
            {mergePreview.description}
          </div>

          {mergePreview.hasConflicts && (
            <div className="preview-conflicts">
              <div className="conflicts-title">
                ⚠️ Conflitos Detectados
              </div>
              <div className="conflicts-list">
                {mergePreview.conflictFiles.map((file, index) => (
                  <div key={index} className="conflicts-file">
                    {file.path} - {file.reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="preview-actions">
            <button className="preview-btn cancel" onClick={cancelOperation}>
              Cancelar
            </button>
            {mergePreview.hasConflicts ? (
              <button className="preview-btn resolve" onClick={executeOperation}>
                Resolver Conflitos
              </button>
            ) : (
              <button className="preview-btn confirm" onClick={executeOperation}>
                Confirmar {currentOperation}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Helper text when no operation is ready */}
      {!mergePreview && sourceBranch && targetBranch && (
        <div className="helper-text visible">
          <div className="helper-icon">👆</div>
          <div className="helper-title">Arraste commits para fazer {currentOperation}</div>
          <div className="helper-description">
            Selecione commits da branch origem e arraste para a branch destino,<br/>
            ou clique nos commits para selecioná-los
          </div>
        </div>
      )}

      {/* Merge arrow indicator */}
      <div className={`merge-arrow ${draggedCommit ? 'visible' : ''}`}>
        ➡️
      </div>
    </div>
  );
};

export default MergeInteractive;