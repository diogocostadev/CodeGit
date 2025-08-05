import { useState, useEffect } from "react";
import "./ConflictResolver.css";
import "./design-system.css";

interface RepositoryInfo {
  name: string;
  path: string;
  current_branch: string;
  last_commit: string;
  is_dirty: boolean;
  last_accessed: number;
}

interface ConflictFile {
  path: string;
  status: 'unresolved' | 'resolved';
  hasChanges: boolean;
}

interface ConflictChunk {
  id: string;
  type: 'conflict' | 'unchanged';
  localContent: string;
  remoteContent: string;
  baseContent?: string;
  startLine: number;
  endLine: number;
  resolution: 'none' | 'local' | 'remote' | 'both' | 'custom';
  customContent?: string;
}

interface ConflictSuggestion {
  id: string;
  description: string;
  confidence: number;
  resolution: 'local' | 'remote' | 'both' | 'custom';
  content?: string;
}

interface ConflictResolverProps {
  repository: RepositoryInfo;
  onNavigate: (screen: string) => void;
}

const ConflictResolver: React.FC<ConflictResolverProps> = ({ repository, onNavigate }) => {
  const [conflictFiles, setConflictFiles] = useState<ConflictFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ConflictFile | null>(null);
  const [conflictChunks, setConflictChunks] = useState<ConflictChunk[]>([]);
  const [suggestions, setSuggestions] = useState<ConflictSuggestion[]>([]);
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [resolvedContent, setResolvedContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [autoApplying, setAutoApplying] = useState(false);

  useEffect(() => {
    if (repository) {
      loadConflictFiles();
    }
  }, [repository]);

  useEffect(() => {
    if (selectedFile) {
      loadFileConflicts(selectedFile.path);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (conflictChunks.length > 0 && aiSuggestionsEnabled) {
      generateAISuggestions();
    }
  }, [conflictChunks, aiSuggestionsEnabled]);

  useEffect(() => {
    generateResolvedContent();
  }, [conflictChunks]);

  const loadConflictFiles = async () => {
    try {
      setLoading(true);
      // Simular carregamento de arquivos em conflito
      const mockFiles: ConflictFile[] = [
        { path: 'src/components/Auth.tsx', status: 'unresolved', hasChanges: true },
        { path: 'src/utils/api.ts', status: 'unresolved', hasChanges: true },
        { path: 'package.json', status: 'unresolved', hasChanges: true },
        { path: 'README.md', status: 'resolved', hasChanges: false },
        { path: 'src/styles/main.css', status: 'unresolved', hasChanges: true }
      ];
      
      setConflictFiles(mockFiles);
      
      // Selecionar primeiro arquivo não resolvido
      const firstUnresolved = mockFiles.find(f => f.status === 'unresolved');
      if (firstUnresolved) {
        setSelectedFile(firstUnresolved);
      }
    } catch (error) {
      console.error("Failed to load conflict files:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFileConflicts = async (filePath: string) => {
    try {
      // Simular carregamento de conflitos do arquivo
      const mockChunks: ConflictChunk[] = generateMockConflicts(filePath);
      setConflictChunks(mockChunks);
    } catch (error) {
      console.error("Failed to load file conflicts:", error);
    }
  };

  const generateMockConflicts = (filePath: string): ConflictChunk[] => {
    if (filePath.endsWith('.tsx')) {
      return [
        {
          id: '1',
          type: 'unchanged',
          localContent: 'import React from "react";\nimport { useState } from "react";',
          remoteContent: 'import React from "react";\nimport { useState } from "react";',
          startLine: 1,
          endLine: 2,
          resolution: 'none'
        },
        {
          id: '2', 
          type: 'conflict',
          localContent: 'import { validateUser } from "../utils/auth";\nimport { UserService } from "../services/user";',
          remoteContent: 'import { authenticateUser } from "../utils/authentication";\nimport { AuthService } from "../services/auth";',
          startLine: 3,
          endLine: 4,
          resolution: 'none'
        },
        {
          id: '3',
          type: 'unchanged',
          localContent: '\nconst AuthComponent: React.FC = () => {',
          remoteContent: '\nconst AuthComponent: React.FC = () => {',
          startLine: 5,
          endLine: 6,
          resolution: 'none'
        },
        {
          id: '4',
          type: 'conflict',
          localContent: '  const handleLogin = async (credentials: LoginData) => {\n    const user = await validateUser(credentials);\n    if (user) {\n      UserService.setCurrentUser(user);\n    }\n  };',
          remoteContent: '  const handleLogin = async (credentials: AuthCredentials) => {\n    const result = await authenticateUser(credentials);\n    if (result.success) {\n      AuthService.loginUser(result.user);\n    }\n  };',
          startLine: 7,
          endLine: 12,
          resolution: 'none'
        }
      ];
    } else if (filePath === 'package.json') {
      return [
        {
          id: '5',
          type: 'unchanged',
          localContent: '{\n  "name": "codegit",\n  "version": "0.1.0",',
          remoteContent: '{\n  "name": "codegit",\n  "version": "0.1.0",',
          startLine: 1,
          endLine: 3,
          resolution: 'none'
        },
        {
          id: '6',
          type: 'conflict',
          localContent: '  "dependencies": {\n    "react": "^18.2.0",\n    "axios": "^1.4.0",\n    "lodash": "^4.17.21"\n  }',
          remoteContent: '  "dependencies": {\n    "react": "^18.2.0", \n    "fetch": "^2.1.0",\n    "ramda": "^0.29.0"\n  }',
          startLine: 4,
          endLine: 8,
          resolution: 'none'
        }
      ];
    }
    
    return [
      {
        id: '7',
        type: 'conflict',
        localContent: 'Local changes to this file...',
        remoteContent: 'Remote changes to this file...',
        startLine: 1,
        endLine: 5,
        resolution: 'none'
      }
    ];
  };

  const generateAISuggestions = async () => {
    try {
      // Simular sugestões de IA baseadas nos conflitos
      const mockSuggestions: ConflictSuggestion[] = [
        {
          id: 's1',
          description: 'Manter imports locais, são mais consistentes com o padrão do projeto',
          confidence: 0.85,
          resolution: 'local'
        },
        {
          id: 's2', 
          description: 'Usar AuthService remoto, tem melhor estrutura de tipos',
          confidence: 0.92,
          resolution: 'remote'
        },
        {
          id: 's3',
          description: 'Combinar dependências - manter react local + fetch remoto',
          confidence: 0.78,
          resolution: 'custom',
          content: '  "dependencies": {\n    "react": "^18.2.0",\n    "axios": "^1.4.0",\n    "fetch": "^2.1.0",\n    "lodash": "^4.17.21"\n  }'
        }
      ];
      
      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error("Failed to generate AI suggestions:", error);
    }
  };

  const handleChunkResolution = (chunkId: string, resolution: ConflictChunk['resolution'], customContent?: string) => {
    setConflictChunks(prev => prev.map(chunk => 
      chunk.id === chunkId 
        ? { ...chunk, resolution, customContent }
        : chunk
    ));
  };

  const generateResolvedContent = () => {
    let content = "";
    
    conflictChunks.forEach(chunk => {
      if (chunk.type === 'unchanged') {
        content += chunk.localContent + "\n";
      } else {
        switch (chunk.resolution) {
          case 'local':
            content += chunk.localContent + "\n";
            break;
          case 'remote':
            content += chunk.remoteContent + "\n";
            break;
          case 'both':
            content += chunk.localContent + "\n" + chunk.remoteContent + "\n";
            break;
          case 'custom':
            content += (chunk.customContent || chunk.localContent) + "\n";
            break;
          default:
            content += "<<< CONFLITO NÃO RESOLVIDO >>>\n";
        }
      }
    });
    
    setResolvedContent(content);
  };

  const acceptAllLocal = () => {
    setAutoApplying(true);
    setConflictChunks(prev => prev.map(chunk => 
      chunk.type === 'conflict' 
        ? { ...chunk, resolution: 'local' }
        : chunk
    ));
    setTimeout(() => setAutoApplying(false), 1000);
  };

  const acceptAllRemote = () => {
    setAutoApplying(true);
    setConflictChunks(prev => prev.map(chunk => 
      chunk.type === 'conflict' 
        ? { ...chunk, resolution: 'remote' }
        : chunk
    ));
    setTimeout(() => setAutoApplying(false), 1000);
  };

  const acceptAllSuggestions = () => {
    setAutoApplying(true);
    // Aplicar sugestões de IA automaticamente
    setTimeout(() => {
      setConflictChunks(prev => prev.map((chunk, index) => {
        if (chunk.type === 'conflict' && suggestions[index]) {
          const suggestion = suggestions[index];
          return { 
            ...chunk, 
            resolution: suggestion.resolution,
            customContent: suggestion.content
          };
        }
        return chunk;
      }));
      setAutoApplying(false);
    }, 1500);
  };

  const saveResolution = async () => {
    if (!selectedFile) return;

    try {
      // Salvar resolução do arquivo
      console.log("Saving resolution for:", selectedFile.path);
      
      // Marcar arquivo como resolvido
      setConflictFiles(prev => prev.map(file => 
        file.path === selectedFile.path 
          ? { ...file, status: 'resolved', hasChanges: false }
          : file
      ));

      // Próximo arquivo não resolvido
      const nextUnresolved = conflictFiles.find(f => f.status === 'unresolved' && f.path !== selectedFile.path);
      if (nextUnresolved) {
        setSelectedFile(nextUnresolved);
      }
    } catch (error) {
      console.error("Failed to save resolution:", error);
    }
  };

  const finishResolution = async () => {
    try {
      console.log("Finishing conflict resolution");
      // Navegar de volta ao merge ou dashboard
      onNavigate('merge');
    } catch (error) {
      console.error("Failed to finish resolution:", error);
    }
  };

  const hasUnresolvedConflicts = conflictChunks.some(chunk => 
    chunk.type === 'conflict' && chunk.resolution === 'none'
  );

  const allFilesResolved = conflictFiles.every(file => file.status === 'resolved');

  const unresolvedCount = conflictFiles.filter(f => f.status === 'unresolved').length;

  return (
    <div className="conflict-resolver-container">
      {/* Header */}
      <div className="conflict-header">
        <div className="conflict-title-section">
          <button className="conflict-back-btn" onClick={() => onNavigate("merge")}>
            ← Voltar ao Merge
          </button>
          <div className="conflict-title-info">
            <div className="conflict-title">Resolução Visual de Conflitos</div>
            <div className="conflict-subtitle">
              <span>⚠️ {repository.name}</span>
              <span>•</span>
              <span>{unresolvedCount} arquivos com conflitos</span>
            </div>
          </div>
        </div>

        <div className="conflict-actions">
          <div className="bulk-actions">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={acceptAllLocal}
              disabled={autoApplying}
            >
              📍 Aceitar Tudo Local
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={acceptAllRemote}
              disabled={autoApplying}
            >
              🌐 Aceitar Tudo Remoto
            </button>
            {aiSuggestionsEnabled && suggestions.length > 0 && (
              <button 
                className="btn btn-primary btn-sm"
                onClick={acceptAllSuggestions}
                disabled={autoApplying}
              >
                🤖 Aplicar Sugestões IA
              </button>
            )}
          </div>

          <div className="resolution-actions">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? '📝 Editar' : '👁️ Preview'}
            </button>
            
            <button 
              className="btn btn-primary"
              onClick={saveResolution}
              disabled={hasUnresolvedConflicts || !selectedFile}
            >
              💾 Salvar Arquivo
            </button>

            <button 
              className="btn btn-success"
              onClick={finishResolution}
              disabled={!allFilesResolved}
            >
              ✅ Finalizar Resolução
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="conflict-main">
        {/* Sidebar com arquivos */}
        <div className="files-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title">Arquivos em Conflito</div>
            <div className="files-progress">
              {conflictFiles.filter(f => f.status === 'resolved').length} / {conflictFiles.length}
            </div>
          </div>

          <div className="files-list">
            {loading ? (
              <div className="loading-files">Carregando arquivos...</div>
            ) : (
              conflictFiles.map((file) => (
                <div
                  key={file.path}
                  className={`file-item ${selectedFile?.path === file.path ? 'active' : ''} ${file.status}`}
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="file-status-indicator">
                    {file.status === 'resolved' ? '✅' : '⚠️'}
                  </div>
                  <div className="file-info">
                    <div className="file-name">{file.path.split('/').pop()}</div>
                    <div className="file-path">{file.path}</div>
                  </div>
                  {file.hasChanges && (
                    <div className="file-changes-dot"></div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Sugestões IA */}
          {aiSuggestionsEnabled && suggestions.length > 0 && (
            <div className="ai-suggestions">
              <div className="suggestions-header">
                <div className="suggestions-title">🤖 Sugestões IA</div>
                <button 
                  className="toggle-ai-btn"
                  onClick={() => setAiSuggestionsEnabled(!aiSuggestionsEnabled)}
                >
                  {aiSuggestionsEnabled ? 'Desabilitar' : 'Habilitar'}
                </button>
              </div>
              <div className="suggestions-list">
                {suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="suggestion-item">
                    <div className="suggestion-confidence">
                      {Math.round(suggestion.confidence * 100)}%
                    </div>
                    <div className="suggestion-description">
                      {suggestion.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Área principal - 3 colunas ou preview */}
        <div className="conflict-content">
          {!selectedFile ? (
            <div className="no-file-selected">
              <div className="no-file-icon">📁</div>
              <div className="no-file-title">Selecione um arquivo</div>
              <div className="no-file-description">
                Escolha um arquivo da lista para começar a resolver conflitos
              </div>
            </div>
          ) : showPreview ? (
            <div className="preview-panel">
              <div className="preview-header">
                <div className="preview-title">Preview do Resultado</div>
                <div className="preview-file">{selectedFile.path}</div>
              </div>
              <div className="preview-content">
                <pre className="preview-code">{resolvedContent}</pre>
              </div>
            </div>
          ) : (
            <div className="three-column-layout">
              {/* Coluna Local */}
              <div className="column local">
                <div className="column-header local">
                  <div className="column-icon">📍</div>
                  <div className="column-info">
                    <div className="column-title">Local (Suas Mudanças)</div>
                    <div className="column-subtitle">Branch atual</div>
                  </div>
                </div>
                <div className="column-content">
                  {conflictChunks.map((chunk) => (
                    <div key={chunk.id} className={`chunk ${chunk.type}`}>
                      <div className="chunk-lines">
                        Linhas {chunk.startLine}-{chunk.endLine}
                      </div>
                      <pre className="chunk-code local">{chunk.localContent}</pre>
                      {chunk.type === 'conflict' && (
                        <button
                          className={`accept-btn local ${chunk.resolution === 'local' ? 'active' : ''}`}
                          onClick={() => handleChunkResolution(chunk.id, 'local')}
                        >
                          Aceitar Local
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Coluna Resultado */}
              <div className="column result">
                <div className="column-header result">
                  <div className="column-icon">🎯</div>
                  <div className="column-info">
                    <div className="column-title">Resultado</div>
                    <div className="column-subtitle">Resolução final</div>
                  </div>
                </div>
                <div className="column-content">
                  {conflictChunks.map((chunk) => (
                    <div key={chunk.id} className={`chunk ${chunk.type} ${chunk.resolution}`}>
                      <div className="chunk-controls">
                        {chunk.type === 'conflict' && (
                          <div className="resolution-options">
                            <button
                              className={`option-btn both ${chunk.resolution === 'both' ? 'active' : ''}`}
                              onClick={() => handleChunkResolution(chunk.id, 'both')}
                              title="Manter ambas as versões"
                            >
                              Ambas
                            </button>
                            <button
                              className={`option-btn custom ${chunk.resolution === 'custom' ? 'active' : ''}`}
                              onClick={() => {
                                const customContent = prompt('Digite o conteúdo personalizado:', chunk.localContent);
                                if (customContent !== null) {
                                  handleChunkResolution(chunk.id, 'custom', customContent);
                                }
                              }}
                              title="Edição personalizada"
                            >
                              ✏️ Editar
                            </button>
                          </div>
                        )}
                      </div>
                      <pre className={`chunk-code result ${chunk.resolution}`}>
                        {chunk.type === 'unchanged' 
                          ? chunk.localContent
                          : chunk.resolution === 'local' 
                            ? chunk.localContent
                            : chunk.resolution === 'remote'
                              ? chunk.remoteContent
                              : chunk.resolution === 'both'
                                ? chunk.localContent + '\n' + chunk.remoteContent
                                : chunk.resolution === 'custom'
                                  ? chunk.customContent || chunk.localContent
                                  : '⚠️ Conflito não resolvido'
                        }
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coluna Remota */}
              <div className="column remote">
                <div className="column-header remote">
                  <div className="column-icon">🌐</div>
                  <div className="column-info">
                    <div className="column-title">Remoto (Incoming)</div>
                    <div className="column-subtitle">Branch externa</div>
                  </div>
                </div>
                <div className="column-content">
                  {conflictChunks.map((chunk) => (
                    <div key={chunk.id} className={`chunk ${chunk.type}`}>
                      <div className="chunk-lines">
                        Linhas {chunk.startLine}-{chunk.endLine}
                      </div>
                      <pre className="chunk-code remote">{chunk.remoteContent}</pre>
                      {chunk.type === 'conflict' && (
                        <button
                          className={`accept-btn remote ${chunk.resolution === 'remote' ? 'active' : ''}`}
                          onClick={() => handleChunkResolution(chunk.id, 'remote')}
                        >
                          Aceitar Remoto
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading overlay para auto-aplicação */}
      {autoApplying && (
        <div className="auto-apply-overlay">
          <div className="auto-apply-content">
            <div className="auto-apply-spinner"></div>
            <div className="auto-apply-text">Aplicando resoluções automaticamente...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictResolver;