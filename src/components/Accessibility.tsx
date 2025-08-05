import React, { useEffect, useRef } from 'react';
import '../design-system.css';

// Skip to content link for keyboard navigation
export const SkipToContent: React.FC = () => {
  return (
    <a 
      href="#main-content" 
      className="skip-to-content sr-only focus:not-sr-only"
      tabIndex={0}
    >
      Pular para o conteúdo principal
    </a>
  );
};

// Focus trap for modals and dialogs
interface FocusTrapProps {
  children: React.ReactNode;
  active: boolean;
  className?: string;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({ 
  children, 
  active, 
  className = '' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus the first element
    if (firstElement) {
      firstElement.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [active]);

  if (!active) return <>{children}</>;

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

// Accessible button with proper ARIA attributes
interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  tabIndex?: number;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  onClick,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaPressed,
  className = 'btn btn-primary',
  type = 'button',
  tabIndex = 0
}) => {
  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-pressed={ariaPressed}
      tabIndex={disabled ? -1 : tabIndex}
    >
      {children}
    </button>
  );
};

// Accessible input with proper labels and error handling
interface AccessibleInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error,
  hint,
  className = ''
}) => {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="text-error-500 ml-1" aria-label="obrigatório">*</span>}
      </label>
      
      {hint && (
        <div id={hintId} className="form-hint text-sm text-tertiary mb-2">
          {hint}
        </div>
      )}
      
      <input
        id={id}
        type={type}
        className={`input ${error ? 'input-error' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : 'false'}
      />
      
      {error && (
        <div id={errorId} className="form-error text-sm text-error-500 mt-1" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

// Accessible modal with proper ARIA attributes
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Handle Escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <FocusTrap active={isOpen}>
        <div
          ref={modalRef}
          className={`modal-content ${className}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="modal-header">
            <h2 id="modal-title" className="modal-title">
              {title}
            </h2>
            <AccessibleButton
              onClick={onClose}
              className="modal-close"
              ariaLabel="Fechar modal"
            >
              ✕
            </AccessibleButton>
          </div>
          <div className="modal-body">
            {children}
          </div>
        </div>
      </FocusTrap>
    </div>
  );
};

// Accessible tab navigation
interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface AccessibleTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const AccessibleTabs: React.FC<AccessibleTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    const currentIndex = tabs.findIndex(tab => tab.id === tabId);
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    const newTab = tabs[newIndex];
    if (newTab && !newTab.disabled) {
      onTabChange(newTab.id);
    }
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={`accessible-tabs ${className}`}>
      <div className="tab-list" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`tab-button ${
              activeTab === tab.id ? 'active' : ''
            } ${tab.disabled ? 'disabled' : ''}`}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            tabIndex={activeTab === tab.id ? 0 : -1}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div
        className="tab-panel"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTabContent}
      </div>
    </div>
  );
};

// Live region for announcing dynamic content changes
interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  className?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  politeness = 'polite',
  className = ''
}) => {
  return (
    <div
      className={`sr-only ${className}`}
      aria-live={politeness}
      aria-atomic="true"
    >
      {message}
    </div>
  );
};

// Progress indicator with accessible labels
interface AccessibleProgressProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export const AccessibleProgress: React.FC<AccessibleProgressProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  className = ''
}) => {
  const percentage = Math.round((value / max) * 100);
  const ariaLabel = label ? `${label}: ${percentage}%` : `${percentage}% completo`;

  return (
    <div className={`progress-container ${className}`}>
      {label && (
        <div className="progress-label text-sm font-medium text-primary mb-2">
          {label}
          {showPercentage && <span className="ml-2 text-tertiary">({percentage}%)</span>}
        </div>
      )}
      
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={ariaLabel}
        />
      </div>
      
      <LiveRegion message={`Progresso: ${percentage}%`} />
    </div>
  );
};