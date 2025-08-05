import React from 'react';
import '../design-system.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : '';
  
  return (
    <div className={`spinner ${sizeClass} ${className}`} />
  );
};

interface LoadingOverlayProps {
  children?: React.ReactNode;
  message?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  children, 
  message = "Carregando...",
  className = ''
}) => {
  return (
    <div className={`loading-overlay ${className}`}>
      <div className="loading-content">
        <LoadingSpinner size="lg" />
        <div className="loading-message text-primary">{message}</div>
        {children}
      </div>
    </div>
  );
};

interface LoadingCardProps {
  title?: string;
  message?: string;
  className?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ 
  title = "Carregando",
  message = "Aguarde um momento...",
  className = ''
}) => {
  return (
    <div className={`card ${className}`}>
      <div className="card-body text-center py-8">
        <LoadingSpinner size="lg" className="mb-4 mx-auto" />
        <div className="text-lg font-medium text-primary mb-2">{title}</div>
        <div className="text-sm text-tertiary">{message}</div>
      </div>
    </div>
  );
};

interface LoadingButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  loading = false,
  children,
  className = 'btn btn-primary',
  onClick,
  disabled = false,
  type = 'button'
}) => {
  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <LoadingSpinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
};

interface LoadingSkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  rounded?: boolean;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  width = '100%',
  height = '1rem',
  className = '',
  rounded = false
}) => {
  return (
    <div 
      className={`loading-skeleton ${rounded ? 'rounded-full' : 'rounded-md'} ${className}`}
      style={{ width, height }}
    />
  );
};

interface LoadingListProps {
  items?: number;
  className?: string;
}

export const LoadingList: React.FC<LoadingListProps> = ({ 
  items = 3,
  className = ''
}) => {
  return (
    <div className={`loading-list ${className}`}>
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="loading-list-item p-4 border-b border-secondary">
          <div className="flex items-center gap-3">
            <LoadingSkeleton width="40px" height="40px" rounded />
            <div className="flex-1">
              <LoadingSkeleton width="60%" height="1rem" className="mb-2" />
              <LoadingSkeleton width="40%" height="0.75rem" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const LoadingTable: React.FC<LoadingTableProps> = ({ 
  rows = 5,
  columns = 4,
  className = ''
}) => {
  return (
    <div className={`loading-table ${className}`}>
      <div className="table-header p-4 border-b border-secondary">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: columns }, (_, index) => (
            <LoadingSkeleton key={index} width="80%" height="1rem" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="table-row p-4 border-b border-secondary">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: columns }, (_, colIndex) => (
              <LoadingSkeleton key={colIndex} width="90%" height="0.875rem" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  title = "Algo deu errado",
  message = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
  className = ''
}) => {
  return (
    <div className={`error-state text-center p-8 ${className}`}>
      <div className="error-icon text-4xl mb-4">⚠️</div>
      <div className="text-lg font-medium text-primary mb-2">{title}</div>
      <div className="text-sm text-tertiary mb-4">{message}</div>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          🔄 Tentar Novamente
        </button>
      )}
    </div>
  );
};

interface EmptyStateProps {
  icon?: string;
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon = "📭",
  title = "Nenhum item encontrado",
  message = "Ainda não há dados para exibir.",
  action,
  className = ''
}) => {
  return (
    <div className={`empty-state text-center p-8 ${className}`}>
      <div className="empty-icon text-4xl mb-4">{icon}</div>
      <div className="text-lg font-medium text-primary mb-2">{title}</div>
      <div className="text-sm text-tertiary mb-4">{message}</div>
      {action && (
        <button className="btn btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};