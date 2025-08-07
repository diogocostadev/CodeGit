import React, { useState, useRef, useEffect } from 'react';
import { AppState, HeaderState, Notification } from '../../types/state';
import { useSmartNotifications } from '../../hooks/useSmartNotifications';
import Settings from '../../Settings';
import Account from '../../Account';
import './Header.css';

interface HeaderProps {
  appState: AppState;
  layout: HeaderState;
  onLayoutChange: (changes: Partial<HeaderState>) => void;
  onSidebarToggle: () => void;
  onDetailsPanelToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({
  appState,
  layout,
  onLayoutChange,
  onSidebarToggle,
  onDetailsPanelToggle
}) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    onLayoutChange({ global_search: value });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (layout.global_search.trim()) {
      // Implement global search functionality
      console.log('Searching for:', layout.global_search);
    }
  };

  const toggleUserMenu = () => {
    onLayoutChange({ user_menu_open: !layout.user_menu_open });
  };

  // Use smart notifications system
  const {
    notifications,
    unreadCount,
    markAllNotificationsRead,
    markNotificationRead,
    removeNotification,
    getNotificationStats
  } = useSmartNotifications();

  const currentWorkspace = appState.workspaces[appState.active_workspace];
  const notificationStats = getNotificationStats();

  // Debug: log user data
  console.log('🐛 Header - User data:', appState.user);
  console.log('🐛 Header - Full appState:', appState);

  return (
    <header className="app-header">
      <div className="header-left">
        {/* Hamburger menu */}
        <button
          className="header-button hamburger-menu"
          onClick={onSidebarToggle}
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 3h12a1 1 0 010 2H2a1 1 0 010-2zM2 7h12a1 1 0 010 2H2a1 1 0 010-2zM2 11h12a1 1 0 010 2H2a1 1 0 010-2z"/>
          </svg>
        </button>

        {/* App logo and title */}
        <div className="app-brand">
          <h1 className="app-title">CodeGit</h1>
        </div>

        {/* Breadcrumb navigation */}
        {layout.show_breadcrumb && currentWorkspace && (
          <nav className="breadcrumb">
            <span className="breadcrumb-item workspace">
              {currentWorkspace.name}
            </span>
            {appState.current_repository && (
              <>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-item repository">
                  {currentWorkspace.repositories[appState.current_repository]?.name}
                </span>
              </>
            )}
          </nav>
        )}
      </div>

      <div className="header-center">
        {/* Global search */}
        <form className={`search-form ${searchFocused ? 'focused' : ''}`} onSubmit={handleSearchSubmit}>
          <div className="search-input-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search repositories, files, commits..."
              value={layout.global_search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {layout.global_search && (
              <button
                type="button"
                className="search-clear"
                onClick={() => handleSearchChange('')}
                aria-label="Clear search"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 4.586L9.707.879A1 1 0 0111.121 2.293L7.414 6l3.707 3.707a1 1 0 01-1.414 1.414L6 7.414l-3.707 3.707A1 1 0 01.879 9.707L4.586 6 .879 2.293A1 1 0 012.293.879L6 4.586z"/>
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="header-right">

        {/* Notifications */}
        <div className="notifications-wrapper" ref={notificationsRef}>
          <button
            className={`header-button notifications-button ${unreadCount > 0 ? 'has-notifications' : ''}`}
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            title={`${unreadCount} unread notifications`}
            aria-label="Notifications"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a6 6 0 016 6c0 2.223.553 4.125 1.562 5.5H.438C1.447 12.125 2 10.223 2 8a6 6 0 016-6zm0 12a2 2 0 002-2H6a2 2 0 002 2z"/>
            </svg>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {notificationsOpen && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h3>Notifications</h3>
                <div className="notification-stats">
                  <span className="stat-text">
                    {notificationStats.recentCount} today
                  </span>
                  {unreadCount > 0 && (
                    <button 
                      className="mark-all-read"
                      onClick={() => {
                        markAllNotificationsRead();
                        setNotificationsOpen(false);
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="notifications-list">
                {notifications.length > 0 ? (
                  notifications.slice(0, 10).map(notification => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification}
                      onMarkRead={markNotificationRead}
                      onRemove={removeNotification}
                    />
                  ))
                ) : (
                  <div className="empty-notifications">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <p>No notifications</p>
                    <p className="empty-subtitle">You'll see updates about your repositories here</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <button
          className="header-button settings-button"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          aria-label="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 002.693 1.115l.292-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 001.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 00-1.115 2.693l.16.292c.415.764-.42 1.6-1.185 1.184l-.292-.159a1.873 1.873 0 00-2.692 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 00-2.693-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.292A1.873 1.873 0 001.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 003.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 002.692-1.116l.094-.318z"/>
          </svg>
        </button>

        {/* Details panel toggle */}
        <button
          className="header-button details-toggle"
          onClick={onDetailsPanelToggle}
          title="Toggle details panel"
          aria-label="Toggle details panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 7.75zM1.75 12a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H1.75z"/>
          </svg>
        </button>

        {/* User menu */}
        <div className="user-menu-wrapper">
          <button
            className="header-button user-button"
            onClick={toggleUserMenu}
            aria-label="User menu"
          >
            <div className="user-avatar">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm2-3a2 2 0 11-4 0 2 2 0 014 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
              </svg>
            </div>
          </button>

          {layout.user_menu_open && (
            <div className="user-menu-dropdown">
              <div className="user-info">
                <div className="user-avatar large">
                  <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm2-3a2 2 0 11-4 0 2 2 0 014 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                  </svg>
                </div>
                <div className="user-details">
                  <div className="user-name">{appState.user?.name || 'User'}</div>
                  <div className="user-email">{appState.user?.email || 'user@example.com'}</div>
                </div>
              </div>
              <div className="user-menu-divider"></div>
              <div className="user-menu-items">
                <button 
                  className="user-menu-item"
                  onClick={() => {
                    setAccountOpen(true);
                    onLayoutChange({ user_menu_open: false });
                  }}
                >
                  Profile
                </button>
                <button 
                  className="user-menu-item"
                  onClick={() => {
                    setSettingsOpen(true);
                    onLayoutChange({ user_menu_open: false });
                  }}
                >
                  Preferences
                </button>
                <button className="user-menu-item">About</button>
                <div className="user-menu-divider"></div>
                <button 
                  className="user-menu-item"
                  onClick={async () => {
                    // Reset app state and force onboarding
                    try {
                      // Clear localStorage
                      localStorage.clear();
                      
                      // Reset database to first time state (optional - could also clear all data)
                      // For now, just restart the app which will trigger onboarding
                      window.location.reload();
                    } catch (error) {
                      console.error('Error during sign out:', error);
                      window.location.reload(); // Force reload as fallback
                    }
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button 
                className="modal-close-button"
                onClick={() => setSettingsOpen(false)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                </svg>
              </button>
            </div>
            <div className="modal-content">
              <Settings onNavigate={() => setSettingsOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {accountOpen && (
        <div className="modal-overlay" onClick={() => setAccountOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Account</h2>
              <button 
                className="modal-close-button"
                onClick={() => setAccountOpen(false)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                </svg>
              </button>
            </div>
            <div className="modal-content">
              <Account onNavigate={() => setAccountOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

const NotificationItem: React.FC<{ 
  notification: Notification;
  onMarkRead?: (id: string) => void;
  onRemove?: (id: string) => void;
}> = ({ notification, onMarkRead, onRemove }) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-green-500">
            <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4.5-4.5z"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-yellow-500">
            <path d="M8.982 1.566a1.13 1.13 0 00-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.89 0 1.438-.99.982-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 01-1.1 0L7.1 5.995A.905.905 0 018 5zm.002 6a1 1 0 100 2 1 1 0 000-2z"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-red-500">
            <path d="M8 16A8 8 0 108 0a8 8 0 000 16zM5.354 4.646a.5.5 0 10-.708.708L7.293 8l-2.647 2.646a.5.5 0 00.708.708L8 8.707l2.646 2.647a.5.5 0 00.708-.708L8.707 8l2.647-2.646a.5.5 0 00-.708-.708L8 7.293 5.354 4.646z"/>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm.93-9.412l-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 100-2 1 1 0 000 2z"/>
          </svg>
        );
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}>
      <div className="notification-icon">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="notification-content">
        <div className="notification-title">{notification.title}</div>
        <div className="notification-message">{notification.message}</div>
        <div className="notification-meta">
          <span className="notification-time">
            {formatTimeAgo(notification.timestamp)}
          </span>
          {notification.repository_id && (
            <span className="notification-repo">
              {notification.repository_id}
            </span>
          )}
        </div>
        {notification.action && (
          <div className="notification-actions">
            <button className="notification-action-button primary">
              {notification.action.label}
            </button>
          </div>
        )}
      </div>
      <div className="notification-controls">
        {!notification.is_read && onMarkRead && (
          <button 
            className="notification-control-button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            title="Mark as read"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4.5-4.5z"/>
            </svg>
          </button>
        )}
        {onRemove && (
          <button 
            className="notification-control-button remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(notification.id);
            }}
            title="Remove notification"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;