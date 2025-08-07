import React, { useState, useMemo } from 'react';
import { RepositoryInfo } from '../../types/state';
import { BulkOperationResult } from '../../types/operations';
import { useBulkOperations } from '../../hooks/useBulkOperations';
import './BulkOperationsPanel.css';

interface BulkOperationsPanelProps {
  repositories: RepositoryInfo[];
  selectedRepositories: Set<string>;
  onClose?: () => void;
}

const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
  repositories,
  selectedRepositories,
  onClose
}) => {
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [operationParams, setOperationParams] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState(false);

  const {
    isRunning,
    progress,
    results,
    error,
    pullAll,
    pushAll,
    fetchAll,
    syncAll,
    checkoutBranchAll,
    createBranchAll,
    deleteBranchAll,
    getStatusAll,
    stashAll,
    resetHardAll,
    cleanAll,
    abortOperation,
    clearResults,
    clearError,
    getValidRepositories,
    getInvalidRepositories,
    getOperationStats
  } = useBulkOperations({
    maxConcurrent: 3,
    timeout: 60000,
    abortOnError: false,
    autoRefreshStatus: true
  });

  const targetRepositories = useMemo(() => {
    return repositories.filter(repo => selectedRepositories.has(repo.id));
  }, [repositories, selectedRepositories]);

  const validRepositories = useMemo(() => {
    return getValidRepositories(targetRepositories);
  }, [targetRepositories, getValidRepositories]);

  const invalidRepositories = useMemo(() => {
    return getInvalidRepositories(targetRepositories);
  }, [targetRepositories, getInvalidRepositories]);

  const operationStats = getOperationStats();

  const handleExecuteOperation = async () => {
    if (!selectedOperation || isRunning) return;
    
    clearError();
    setShowResults(true);

    try {
      switch (selectedOperation) {
        case 'pull':
          await pullAll(validRepositories);
          break;
        case 'push':
          await pushAll(validRepositories);
          break;
        case 'fetch':
          await fetchAll(validRepositories);
          break;
        case 'sync':
          await syncAll(validRepositories);
          break;
        case 'checkout':
          if (!operationParams.branch) {
            throw new Error('Branch name is required for checkout');
          }
          await checkoutBranchAll(validRepositories, operationParams.branch);
          break;
        case 'create_branch':
          if (!operationParams.branch) {
            throw new Error('Branch name is required for create branch');
          }
          await createBranchAll(validRepositories, operationParams.branch, operationParams.fromBranch);
          break;
        case 'delete_branch':
          if (!operationParams.branch) {
            throw new Error('Branch name is required for delete branch');
          }
          await deleteBranchAll(validRepositories, operationParams.branch, operationParams.force || false);
          break;
        case 'status':
          await getStatusAll(validRepositories);
          break;
        case 'stash':
          await stashAll(validRepositories, operationParams.message);
          break;
        case 'reset_hard':
          await resetHardAll(validRepositories, operationParams.target || 'HEAD');
          break;
        case 'clean':
          await cleanAll(validRepositories, operationParams.force || false);
          break;
        default:
          throw new Error(`Unknown operation: ${selectedOperation}`);
      }
    } catch (err: any) {
      console.error('Bulk operation failed:', err);
    }
  };

  const handleParameterChange = (key: string, value: any) => {
    setOperationParams(prev => ({ ...prev, [key]: value }));
  };

  const renderParameterInputs = () => {
    switch (selectedOperation) {
      case 'checkout':
      case 'create_branch':
      case 'delete_branch':
        return (
          <div className="parameter-inputs">
            <div className="input-group">
              <label htmlFor="branch-name">Branch Name</label>
              <input
                id="branch-name"
                type="text"
                value={operationParams.branch || ''}
                onChange={(e) => handleParameterChange('branch', e.target.value)}
                placeholder="Enter branch name"
                disabled={isRunning}
              />
            </div>
            {selectedOperation === 'create_branch' && (
              <div className="input-group">
                <label htmlFor="from-branch">From Branch (optional)</label>
                <input
                  id="from-branch"
                  type="text"
                  value={operationParams.fromBranch || ''}
                  onChange={(e) => handleParameterChange('fromBranch', e.target.value)}
                  placeholder="main"
                  disabled={isRunning}
                />
              </div>
            )}
            {selectedOperation === 'delete_branch' && (
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={operationParams.force || false}
                    onChange={(e) => handleParameterChange('force', e.target.checked)}
                    disabled={isRunning}
                  />
                  Force delete
                </label>
              </div>
            )}
          </div>
        );

      case 'stash':
        return (
          <div className="parameter-inputs">
            <div className="input-group">
              <label htmlFor="stash-message">Message (optional)</label>
              <input
                id="stash-message"
                type="text"
                value={operationParams.message || ''}
                onChange={(e) => handleParameterChange('message', e.target.value)}
                placeholder="Stash message"
                disabled={isRunning}
              />
            </div>
          </div>
        );

      case 'reset_hard':
        return (
          <div className="parameter-inputs">
            <div className="input-group">
              <label htmlFor="reset-target">Target (optional)</label>
              <input
                id="reset-target"
                type="text"
                value={operationParams.target || ''}
                onChange={(e) => handleParameterChange('target', e.target.value)}
                placeholder="HEAD"
                disabled={isRunning}
              />
            </div>
          </div>
        );

      case 'clean':
        return (
          <div className="parameter-inputs">
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={operationParams.force || false}
                  onChange={(e) => handleParameterChange('force', e.target.checked)}
                  disabled={isRunning}
                />
                Force clean (remove ignored files)
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderProgress = () => {
    if (!progress) return null;

    const progressPercentage = (progress.completed + progress.failed) / progress.total * 100;

    return (
      <div className="progress-section">
        <div className="progress-header">
          <h4>{progress.operation_name}</h4>
          <span className="progress-text">
            {progress.completed + progress.failed} / {progress.total}
          </span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="progress-stats">
          <span className="stat completed">✓ {progress.completed}</span>
          <span className="stat failed">✗ {progress.failed}</span>
          <span className="stat pending">⏳ {progress.pending}</span>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!showResults || results.size === 0) return null;

    const resultArray = Array.from(results.values()).sort((a, b) => {
      if (a.status === b.status) {
        return a.repository_name.localeCompare(b.repository_name);
      }
      return a.status === 'error' ? -1 : 1; // Show errors first
    });

    return (
      <div className="results-section">
        <div className="results-header">
          <h4>Operation Results</h4>
          {operationStats && (
            <div className="results-summary">
              <span className="summary-stat completed">✓ {operationStats.completed}</span>
              <span className="summary-stat failed">✗ {operationStats.failed}</span>
              <span className="summary-stat duration">
                ⏱ {Math.round(operationStats.avgDuration)}ms avg
              </span>
            </div>
          )}
        </div>
        <div className="results-list">
          {resultArray.map(result => (
            <div 
              key={result.repository_id}
              className={`result-item ${result.status}`}
            >
              <div className="result-icon">
                {result.status === 'completed' && '✓'}
                {result.status === 'error' && '✗'}
                {result.status === 'running' && '⏳'}
                {result.status === 'pending' && '○'}
              </div>
              <div className="result-info">
                <div className="result-name">{result.repository_name}</div>
                {result.error && (
                  <div className="result-error">{result.error}</div>
                )}
                {result.duration && (
                  <div className="result-duration">{result.duration}ms</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bulk-operations-panel">
      <div className="panel-header">
        <h3>Bulk Operations</h3>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button className="error-dismiss" onClick={clearError}>×</button>
        </div>
      )}

      <div className="panel-content">
        {/* Repository Selection Summary */}
        <div className="selection-summary">
          <h4>Selected Repositories ({targetRepositories.length})</h4>
          {validRepositories.length !== targetRepositories.length && (
            <div className="validation-warning">
              <span className="warning-icon">⚠️</span>
              <span>
                {invalidRepositories.length} repositories will be skipped due to errors
              </span>
            </div>
          )}
          <div className="repository-chips">
            {validRepositories.slice(0, 5).map(repo => (
              <span key={repo.id} className="repo-chip valid">
                {repo.name}
              </span>
            ))}
            {invalidRepositories.slice(0, 3).map(({ repository }) => (
              <span key={repository.id} className="repo-chip invalid">
                {repository.name}
              </span>
            ))}
            {targetRepositories.length > 8 && (
              <span className="repo-chip more">
                +{targetRepositories.length - 8} more
              </span>
            )}
          </div>
        </div>

        {/* Operation Selection */}
        <div className="operation-selection">
          <h4>Select Operation</h4>
          <div className="operation-grid">
            <button
              className={`operation-button ${selectedOperation === 'sync' ? 'selected' : ''}`}
              onClick={() => setSelectedOperation('sync')}
              disabled={isRunning}
            >
              <span className="op-icon">🔄</span>
              <span className="op-label">Sync All</span>
              <span className="op-desc">Fetch + Pull</span>
            </button>
            <button
              className={`operation-button ${selectedOperation === 'pull' ? 'selected' : ''}`}
              onClick={() => setSelectedOperation('pull')}
              disabled={isRunning}
            >
              <span className="op-icon">⬇️</span>
              <span className="op-label">Pull</span>
              <span className="op-desc">Pull latest changes</span>
            </button>
            <button
              className={`operation-button ${selectedOperation === 'push' ? 'selected' : ''}`}
              onClick={() => setSelectedOperation('push')}
              disabled={isRunning}
            >
              <span className="op-icon">⬆️</span>
              <span className="op-label">Push</span>
              <span className="op-desc">Push local changes</span>
            </button>
            <button
              className={`operation-button ${selectedOperation === 'fetch' ? 'selected' : ''}`}
              onClick={() => setSelectedOperation('fetch')}
              disabled={isRunning}
            >
              <span className="op-icon">📡</span>
              <span className="op-label">Fetch</span>
              <span className="op-desc">Fetch remote updates</span>
            </button>
            <button
              className={`operation-button ${selectedOperation === 'checkout' ? 'selected' : ''}`}
              onClick={() => setSelectedOperation('checkout')}
              disabled={isRunning}
            >
              <span className="op-icon">🌿</span>
              <span className="op-label">Checkout Branch</span>
              <span className="op-desc">Switch to branch</span>
            </button>
            <button
              className={`operation-button ${selectedOperation === 'create_branch' ? 'selected' : ''}`}
              onClick={() => setSelectedOperation('create_branch')}
              disabled={isRunning}
            >
              <span className="op-icon">➕</span>
              <span className="op-label">Create Branch</span>
              <span className="op-desc">Create new branch</span>
            </button>
            <button
              className={`operation-button ${selectedOperation === 'status' ? 'selected' : ''}`}
              onClick={() => setSelectedOperation('status')}
              disabled={isRunning}
            >
              <span className="op-icon">📊</span>
              <span className="op-label">Get Status</span>
              <span className="op-desc">Check repo status</span>
            </button>
            <button
              className={`operation-button ${selectedOperation === 'stash' ? 'selected' : ''}`}
              onClick={() => setSelectedOperation('stash')}
              disabled={isRunning}
            >
              <span className="op-icon">📦</span>
              <span className="op-label">Stash</span>
              <span className="op-desc">Stash changes</span>
            </button>
          </div>
        </div>

        {/* Operation Parameters */}
        {renderParameterInputs()}

        {/* Execute Button */}
        <div className="execute-section">
          <button
            className="execute-button"
            onClick={handleExecuteOperation}
            disabled={!selectedOperation || isRunning || validRepositories.length === 0}
          >
            {isRunning ? (
              <>
                <div className="spinner" />
                Running...
              </>
            ) : (
              `Execute on ${validRepositories.length} repositories`
            )}
          </button>
          {isRunning && (
            <button className="abort-button" onClick={abortOperation}>
              Abort Operation
            </button>
          )}
        </div>

        {/* Progress */}
        {renderProgress()}

        {/* Results */}
        {renderResults()}

        {/* Clear Results */}
        {results.size > 0 && !isRunning && (
          <div className="clear-section">
            <button className="clear-button" onClick={clearResults}>
              Clear Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOperationsPanel;