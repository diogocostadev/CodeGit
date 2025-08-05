import { useState, useEffect, useRef, useCallback } from "react";
import "./DiffViewer.css";

interface RepositoryInfo {
  name: string;
  path: string;
  current_branch: string;
  last_commit: string;
  is_dirty: boolean;
  last_accessed: number;
}

interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  oldPath?: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'context';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

interface FileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  lines: DiffLine[];
  oldContent: string;
  newContent: string;
}

type ViewMode = 'split' | 'unified';

interface DiffViewerProps {
  repository: RepositoryInfo;
  commitHash?: string;
  onNavigate: (screen: string) => void;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ repository, commitHash, onNavigate }) => {
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileChange | null>(null);
  const [fileDiff, setFileDiff] = useState<FileDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showWhitespace, setShowWhitespace] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);

  const oldPanelRef = useRef<HTMLDivElement>(null);
  const newPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (repository) {
      loadFileChanges();
    }
  }, [repository, commitHash]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigateFiles(e.key === 'ArrowDown' ? 1 : -1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fileChanges, selectedFile]);

  const loadFileChanges = async () => {
    try {
      setLoading(true);
      
      // Simular carregamento de mudanças - na implementação real seria do backend
      const mockChanges: FileChange[] = [
        {
          path: "src/components/Dashboard.tsx", 
          status: "modified", 
          additions: 45, 
          deletions: 12
        },
        {
          path: "src/components/CommitHistory.tsx", 
          status: "added", 
          additions: 234, 
          deletions: 0
        },
        {
          path: "src/styles/global.css", 
          status: "modified", 
          additions: 18, 
          deletions: 5
        },
        {
          path: "package.json", 
          status: "modified", 
          additions: 3, 
          deletions: 1
        },
        {
          path: "README.md", 
          status: "modified", 
          additions: 15, 
          deletions: 3
        },
        {
          path: "src/utils/deprecated.ts", 
          status: "deleted", 
          additions: 0, 
          deletions: 67
        }
      ];

      setFileChanges(mockChanges);
      if (mockChanges.length > 0) {
        setSelectedFile(mockChanges[0]);
        loadFileDiff(mockChanges[0]);
      }
    } catch (error) {
      console.error("Failed to load file changes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFileDiff = async (file: FileChange) => {
    try {
      // Simular diff do arquivo - na implementação real seria do backend
      const mockDiff: FileDiff = {
        path: file.path,
        status: file.status,
        oldContent: generateMockContent(file, 'old'),
        newContent: generateMockContent(file, 'new'),
        lines: generateMockDiffLines(file)
      };

      setFileDiff(mockDiff);
    } catch (error) {
      console.error("Failed to load file diff:", error);
      setFileDiff(null);
    }
  };

  const generateMockContent = (file: FileChange, version: 'old' | 'new'): string => {
    const fileName = file.path.split('/').pop() || 'file';
    const isTypeScript = fileName.endsWith('.tsx') || fileName.endsWith('.ts');
    const isCSS = fileName.endsWith('.css');
    const isJSON = fileName.endsWith('.json');

    if (file.status === 'added' && version === 'old') return '';
    if (file.status === 'deleted' && version === 'new') return '';

    if (isTypeScript) {
      return `import React from 'react';
import { useState, useEffect } from 'react';
import './styles.css';

interface Props {
  title: string;
  ${version === 'new' ? 'description?: string;' : ''}
}

const Component: React.FC<Props> = ({ title${version === 'new' ? ', description' : ''} }) => {
  const [count, setCount] = useState(0);
  ${version === 'new' ? 'const [loading, setLoading] = useState(false);' : ''}

  useEffect(() => {
    console.log('Component mounted');
    ${version === 'new' ? 'setLoading(true);' : ''}
  }, []);

  return (
    <div className="component">
      <h1>{title}</h1>
      ${version === 'new' ? '{description && <p>{description}</p>}' : ''}
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
      ${version === 'new' ? '{loading && <div>Loading...</div>}' : ''}
    </div>
  );
};

export default Component;`;
    }

    if (isCSS) {
      return `.component {
  padding: ${version === 'new' ? '24px' : '16px'};
  background: ${version === 'new' ? '#ffffff' : '#f5f5f5'};
  border-radius: 8px;
  ${version === 'new' ? 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);' : ''}
}

.component h1 {
  font-size: ${version === 'new' ? '2rem' : '1.5rem'};
  color: #333;
  margin-bottom: 16px;
}

${version === 'new' ? `.component p {
  color: #666;
  margin-bottom: 12px;
}` : ''}

.component button {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  ${version === 'new' ? 'transition: background 0.2s ease;' : ''}
}

${version === 'new' ? `.component button:hover {
  background: #0056b3;
}` : ''}`;
    }

    if (isJSON) {
      return JSON.stringify({
        name: fileName.replace('.json', ''),
        version: version === 'new' ? '2.0.0' : '1.0.0',
        dependencies: version === 'new' ? {
          react: '^18.0.0',
          typescript: '^4.5.0',
          'new-package': '^1.0.0'
        } : {
          react: '^17.0.0',
          typescript: '^4.0.0'
        }
      }, null, 2);
    }

    return `This is ${version} content for ${file.path}
${version === 'new' ? 'Added some new lines here' : ''}
Line 3
${version === 'old' ? 'This line will be removed' : ''}
${version === 'new' ? 'This is a new line' : 'Line 5'}
Final line`;
  };

  const generateMockDiffLines = (file: FileChange): DiffLine[] => {
    const lines: DiffLine[] = [];
    
    if (file.status === 'added') {
      const newContent = generateMockContent(file, 'new');
      newContent.split('\n').forEach((line, index) => {
        lines.push({
          type: 'added',
          newLineNumber: index + 1,
          content: line
        });
      });
    } else if (file.status === 'deleted') {
      const oldContent = generateMockContent(file, 'old');
      oldContent.split('\n').forEach((line, index) => {
        lines.push({
          type: 'removed',
          oldLineNumber: index + 1,
          content: line
        });
      });
    } else {
      // Modified file with mixed changes
      const oldLines = generateMockContent(file, 'old').split('\n');
      const newLines = generateMockContent(file, 'new').split('\n');
      
      let oldIndex = 0;
      let newIndex = 0;
      
      while (oldIndex < oldLines.length || newIndex < newLines.length) {
        if (oldIndex < oldLines.length && newIndex < newLines.length) {
          if (oldLines[oldIndex] === newLines[newIndex]) {
            // Same line
            lines.push({
              type: 'context',
              oldLineNumber: oldIndex + 1,
              newLineNumber: newIndex + 1,
              content: oldLines[oldIndex]
            });
            oldIndex++;
            newIndex++;
          } else {
            // Different lines - show as removed then added
            lines.push({
              type: 'removed',
              oldLineNumber: oldIndex + 1,
              content: oldLines[oldIndex]
            });
            lines.push({
              type: 'added',
              newLineNumber: newIndex + 1,
              content: newLines[newIndex]
            });
            oldIndex++;
            newIndex++;
          }
        } else if (oldIndex < oldLines.length) {
          // Remaining old lines (removed)
          lines.push({
            type: 'removed',
            oldLineNumber: oldIndex + 1,
            content: oldLines[oldIndex]
          });
          oldIndex++;
        } else {
          // Remaining new lines (added)
          lines.push({
            type: 'added',
            newLineNumber: newIndex + 1,
            content: newLines[newIndex]
          });
          newIndex++;
        }
      }
    }
    
    return lines;
  };

  const navigateFiles = (direction: number) => {
    if (!selectedFile || fileChanges.length === 0) return;
    
    const currentIndex = fileChanges.findIndex(f => f.path === selectedFile.path);
    const newIndex = Math.max(0, Math.min(fileChanges.length - 1, currentIndex + direction));
    
    if (newIndex !== currentIndex) {
      const newFile = fileChanges[newIndex];
      setSelectedFile(newFile);
      loadFileDiff(newFile);
    }
  };

  const handleFileSelect = (file: FileChange) => {
    setSelectedFile(file);
    loadFileDiff(file);
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!syncScroll) return;
    
    const target = e.target as HTMLDivElement;
    const isOldPanel = target === oldPanelRef.current;
    const otherPanel = isOldPanel ? newPanelRef.current : oldPanelRef.current;
    
    if (otherPanel) {
      otherPanel.scrollTop = target.scrollTop;
    }
  }, [syncScroll]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added': return 'A';
      case 'modified': return 'M';
      case 'deleted': return 'D';
      default: return '?';
    }
  };

  const getFileName = (path: string) => {
    return path.split('/').pop() || path;
  };

  const getFilePath = (path: string) => {
    const parts = path.split('/');
    return parts.slice(0, -1).join('/');
  };

  const totalAdditions = fileChanges.reduce((sum, file) => sum + file.additions, 0);
  const totalDeletions = fileChanges.reduce((sum, file) => sum + file.deletions, 0);

  return (
    <div className="diff-viewer-container">
      {/* Header */}
      <div className="diff-header">
        <div className="diff-title-section">
          <button className="diff-back-btn" onClick={() => onNavigate("commits")}>
            ← Voltar
          </button>
          <div className="diff-info">
            <div className="diff-title">
              {commitHash ? `Commit ${commitHash.slice(0, 7)}` : 'Working Directory'}
            </div>
            <div className="diff-subtitle">
              {repository.name} • {repository.current_branch}
            </div>
          </div>
        </div>

        <div className="diff-controls">
          <div className="view-mode-toggle">
            <button 
              className={`mode-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
            >
              Split
            </button>
            <button 
              className={`mode-btn ${viewMode === 'unified' ? 'active' : ''}`}
              onClick={() => setViewMode('unified')}
            >
              Unified
            </button>
          </div>

          <div className="diff-options">
            <button 
              className={`option-btn ${showWhitespace ? 'active' : ''}`}
              onClick={() => setShowWhitespace(!showWhitespace)}
              title="Show whitespace"
            >
              ◦
            </button>
            <button 
              className={`option-btn ${wrapLines ? 'active' : ''}`}
              onClick={() => setWrapLines(!wrapLines)}
              title="Wrap lines"
            >
              ↩
            </button>
            <button 
              className={`option-btn ${syncScroll ? 'active' : ''}`}
              onClick={() => setSyncScroll(!syncScroll)}
              title="Sync scroll"
            >
              ⇅
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="diff-main">
        {/* Files sidebar */}
        <div className="files-sidebar">
          <div className="files-header">
            <div className="files-title">
              Arquivos Modificados
              <span style={{
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '500'
              }}>
                {fileChanges.length}
              </span>
            </div>
            <div className="files-summary">
              <div className="summary-item additions">
                <span>+{totalAdditions}</span>
              </div>
              <div className="summary-item deletions">
                <span>−{totalDeletions}</span>
              </div>
            </div>
          </div>

          <div className="files-list">
            {loading ? (
              <div className="loading-diff">
                Carregando arquivos...
              </div>
            ) : (
              fileChanges.map((file) => (
                <div
                  key={file.path}
                  className={`file-item-diff ${selectedFile?.path === file.path ? 'selected' : ''}`}
                  onClick={() => handleFileSelect(file)}
                >
                  <div className={`file-status-icon ${file.status}`}>
                    {getStatusIcon(file.status)}
                  </div>
                  <div className="file-info">
                    <div className="file-name">{getFileName(file.path)}</div>
                    <div className="file-path">{getFilePath(file.path)}</div>
                  </div>
                  <div className="file-stats">
                    {file.additions > 0 && (
                      <div className="stat-additions">+{file.additions}</div>
                    )}
                    {file.deletions > 0 && (
                      <div className="stat-deletions">−{file.deletions}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Diff content */}
        <div className="diff-content">
          {selectedFile && fileDiff ? (
            <>
              <div className="diff-file-header">
                <div className="current-file-info">
                  <div className={`current-file-status ${selectedFile.status}`}>
                    {getStatusIcon(selectedFile.status)}
                  </div>
                  <div className="current-file-name">{selectedFile.path}</div>
                </div>
                <div className="file-actions">
                  <button className="file-action-btn">View File</button>
                  <button className="file-action-btn">Copy Path</button>
                </div>
              </div>

              <div className={`diff-viewer ${syncScroll ? 'synced' : ''}`}>
                {viewMode === 'split' ? (
                  <>
                    {/* Old version (left) */}
                    <div className="diff-panel old">
                      <div className="panel-header old">
                        {selectedFile.status === 'added' ? 'New File' : 'Original'}
                      </div>
                      <div 
                        className="code-container" 
                        ref={oldPanelRef}
                        onScroll={handleScroll}
                      >
                        <div className="code-content">
                          {fileDiff.lines.map((line, index) => (
                            (line.type === 'removed' || line.type === 'context') && (
                              <div key={index} className={`code-line ${line.type}`}>
                                <div className="line-number">
                                  {line.oldLineNumber || ''}
                                </div>
                                <div className="line-content">
                                  {line.content}
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* New version (right) */}
                    <div className="diff-panel new">
                      <div className="panel-header new">
                        {selectedFile.status === 'deleted' ? 'Deleted' : 'Modified'}
                      </div>
                      <div 
                        className="code-container"
                        ref={newPanelRef}
                        onScroll={handleScroll}
                      >
                        <div className="code-content">
                          {fileDiff.lines.map((line, index) => (
                            (line.type === 'added' || line.type === 'context') && (
                              <div key={index} className={`code-line ${line.type}`}>
                                <div className="line-number">
                                  {line.newLineNumber || ''}
                                </div>
                                <div className="line-content">
                                  {line.content}
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // Unified view
                  <div className="diff-panel">
                    <div className="panel-header">Unified Diff</div>
                    <div className="code-container">
                      <div className="code-content">
                        {fileDiff.lines.map((line, index) => (
                          <div key={index} className={`code-line ${line.type}`}>
                            <div className="line-number">
                              {line.oldLineNumber && line.newLineNumber 
                                ? `${line.oldLineNumber}→${line.newLineNumber}`
                                : line.oldLineNumber || line.newLineNumber || ''}
                            </div>
                            <div className="line-content">
                              {line.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-file-selected">
              <div className="no-file-icon">📄</div>
              <div className="no-file-title">
                {loading ? 'Carregando...' : 'Selecione um arquivo'}
              </div>
              <div className="no-file-description">
                {loading 
                  ? 'Carregando diferenças dos arquivos...'
                  : 'Clique em um arquivo na lista para visualizar as mudanças'
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard navigation hint */}
      <div className="keyboard-hint">
        Use ↑↓ para navegar entre arquivos
      </div>
    </div>
  );
};

export default DiffViewer;