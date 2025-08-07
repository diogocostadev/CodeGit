import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console or error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Here you could send the error to a logging service
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            
            <h1>Something went wrong</h1>
            <p>CodeGit encountered an unexpected error. This is usually a temporary issue.</p>
            
            <div className="error-actions">
              <button onClick={this.handleReset} className="error-button primary">
                Try Again
              </button>
              <button onClick={this.handleReload} className="error-button secondary">
                Reload Application
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <div className="error-stack">
                  <h3>Error:</h3>
                  <pre>{this.state.error.toString()}</pre>
                  
                  {this.state.errorInfo && (
                    <>
                      <h3>Component Stack:</h3>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>

          <style>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #0a0b0d;
              color: #e2e8f0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              padding: 20px;
            }

            .error-boundary-content {
              text-align: center;
              max-width: 500px;
            }

            .error-icon {
              margin-bottom: 24px;
              color: #ef4444;
            }

            .error-boundary h1 {
              font-size: 24px;
              font-weight: 600;
              margin: 0 0 12px 0;
              color: #f9fafb;
            }

            .error-boundary p {
              font-size: 16px;
              color: #9ca3af;
              margin: 0 0 32px 0;
              line-height: 1.5;
            }

            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              flex-wrap: wrap;
            }

            .error-button {
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .error-button.primary {
              background: #3b82f6;
              color: white;
            }

            .error-button.primary:hover {
              background: #2563eb;
            }

            .error-button.secondary {
              background: #374151;
              color: #e5e7eb;
              border: 1px solid #4b5563;
            }

            .error-button.secondary:hover {
              background: #4b5563;
            }

            .error-details {
              margin-top: 32px;
              text-align: left;
              background: #1f2937;
              border: 1px solid #374151;
              border-radius: 8px;
              overflow: hidden;
            }

            .error-details summary {
              padding: 12px 16px;
              background: #374151;
              cursor: pointer;
              font-weight: 500;
              color: #f9fafb;
            }

            .error-details summary:hover {
              background: #4b5563;
            }

            .error-stack {
              padding: 16px;
            }

            .error-stack h3 {
              margin: 0 0 8px 0;
              font-size: 14px;
              font-weight: 600;
              color: #f9fafb;
            }

            .error-stack pre {
              background: #0f172a;
              border: 1px solid #1e293b;
              border-radius: 4px;
              padding: 12px;
              font-size: 12px;
              color: #e2e8f0;
              overflow-x: auto;
              margin: 0 0 16px 0;
              line-height: 1.4;
            }

            .error-stack pre:last-child {
              margin-bottom: 0;
            }

            @media (max-width: 640px) {
              .error-boundary-content {
                max-width: 100%;
              }

              .error-actions {
                flex-direction: column;
              }

              .error-button {
                width: 100%;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;