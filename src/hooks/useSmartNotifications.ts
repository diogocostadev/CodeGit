import React, { useEffect, useCallback } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { Notification, NotificationType, RepositoryInfo } from '../types/state';

interface NotificationRule {
  id: string;
  type: NotificationType;
  condition: (repo: RepositoryInfo, prevRepo?: RepositoryInfo) => boolean;
  title: (repo: RepositoryInfo) => string;
  message: (repo: RepositoryInfo) => string;
  priority: 'low' | 'medium' | 'high';
  throttleMs: number; // Minimum time between notifications of this type
}

interface NotificationThrottle {
  [ruleId: string]: { [repoId: string]: number };
}

export const useSmartNotifications = () => {
  const { state, setLayout, addError } = useAppState();

  // Track previous repository states for comparison
  const previousRepoStates = React.useRef<Record<string, RepositoryInfo>>({});
  const notificationThrottles = React.useRef<NotificationThrottle>({});

  // Define notification rules
  const notificationRules: NotificationRule[] = [
    {
      id: 'merge_conflicts',
      type: 'error',
      condition: (repo, prev) => repo.has_conflicts && (!prev || !prev.has_conflicts),
      title: (repo) => `Merge conflicts detected`,
      message: (repo) => `Repository "${repo.name}" has merge conflicts that need resolution`,
      priority: 'high',
      throttleMs: 300000 // 5 minutes
    },
    {
      id: 'behind_commits',
      type: 'warning',
      condition: (repo, prev) => repo.behind_count > 0 && repo.behind_count > (prev?.behind_count || 0),
      title: (repo) => `Repository behind remote`,
      message: (repo) => `"${repo.name}" is ${repo.behind_count} commit${repo.behind_count > 1 ? 's' : ''} behind ${repo.remote_origin || 'origin'}`,
      priority: 'medium',
      throttleMs: 600000 // 10 minutes
    },
    {
      id: 'ahead_commits',
      type: 'info',
      condition: (repo, prev) => repo.ahead_count > 5 && repo.ahead_count > (prev?.ahead_count || 0),
      title: (repo) => `Many unpushed commits`,
      message: (repo) => `"${repo.name}" has ${repo.ahead_count} unpushed commits. Consider pushing your changes.`,
      priority: 'low',
      throttleMs: 1800000 // 30 minutes
    },
    {
      id: 'sync_errors',
      type: 'error',
      condition: (repo, prev) => repo.sync_status === 'error' && prev?.sync_status !== 'error',
      title: (repo) => `Sync error occurred`,
      message: (repo) => `Failed to sync repository "${repo.name}". Check your network connection and credentials.`,
      priority: 'high',
      throttleMs: 300000 // 5 minutes
    },
    {
      id: 'successful_sync',
      type: 'success',
      condition: (repo, prev) => repo.sync_status === 'up_to_date' && prev?.sync_status === 'syncing',
      title: (repo) => `Repository synced`,
      message: (repo) => `"${repo.name}" has been successfully synced with remote`,
      priority: 'low',
      throttleMs: 1800000 // 30 minutes
    },
    {
      id: 'large_changes',
      type: 'warning',
      condition: (repo, prev) => repo.modified_files > 20 && (prev?.modified_files || 0) <= 20,
      title: (repo) => `Large number of changes`,
      message: (repo) => `"${repo.name}" has ${repo.modified_files} modified files. Consider committing your changes.`,
      priority: 'low',
      throttleMs: 3600000 // 1 hour
    },
    {
      id: 'diverged_branch',
      type: 'warning',
      condition: (repo, prev) => repo.sync_status === 'diverged' && prev?.sync_status !== 'diverged',
      title: (repo) => `Branch diverged`,
      message: (repo) => `"${repo.name}" has diverged from remote. You may need to merge or rebase.`,
      priority: 'medium',
      throttleMs: 600000 // 10 minutes
    },
    {
      id: 'stash_overflow',
      type: 'info',
      condition: (repo, prev) => repo.stash_count > 5 && repo.stash_count > (prev?.stash_count || 0),
      title: (repo) => `Many stashes`,
      message: (repo) => `"${repo.name}" has ${repo.stash_count} stashes. Consider cleaning up old stashes.`,
      priority: 'low',
      throttleMs: 3600000 // 1 hour
    }
  ];

  const isNotificationThrottled = useCallback((ruleId: string, repoId: string, throttleMs: number): boolean => {
    const now = Date.now();
    const throttles = notificationThrottles.current;
    
    if (!throttles[ruleId]) throttles[ruleId] = {};
    
    const lastNotification = throttles[ruleId][repoId];
    if (lastNotification && now - lastNotification < throttleMs) {
      return true;
    }
    
    throttles[ruleId][repoId] = now;
    return false;
  }, []);

  const createNotification = useCallback((rule: NotificationRule, repo: RepositoryInfo): Notification => {
    return {
      id: `${rule.id}-${repo.id}-${Date.now()}`,
      type: rule.type,
      title: rule.title(repo),
      message: rule.message(repo),
      timestamp: Date.now(),
      is_read: false,
      repository_id: repo.id,
      action: {
        id: 'view_repository',
        label: 'View Repository',
        icon: 'repository',
        type: 'panel_toggle',
        enabled: true,
        payload: { repositoryId: repo.id }
      }
    };
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    const currentNotifications = state.layout.header.notifications;
    const newNotifications = [notification, ...currentNotifications].slice(0, 50); // Keep max 50 notifications
    
    setLayout({
      header: {
        ...state.layout.header,
        notifications: newNotifications
      }
    });
  }, [state.layout.header, setLayout]);

  const checkNotificationRules = useCallback((currentRepos: Record<string, RepositoryInfo>) => {
    const previousRepos = previousRepoStates.current;
    
    Object.values(currentRepos).forEach(repo => {
      const prevRepo = previousRepos[repo.id];
      
      notificationRules.forEach(rule => {
        try {
          if (rule.condition(repo, prevRepo)) {
            // Check if notification is throttled
            if (!isNotificationThrottled(rule.id, repo.id, rule.throttleMs)) {
              const notification = createNotification(rule, repo);
              addNotification(notification);
              
              console.log(`Smart notification: ${notification.title}`, {
                repository: repo.name,
                type: rule.type,
                priority: rule.priority
              });
            }
          }
        } catch (error) {
          console.error(`Error in notification rule ${rule.id}:`, error);
          addError({
            type: 'application_error',
            message: `Notification system error: ${error}`,
            details: `Rule: ${rule.id}, Repository: ${repo.name}`
          });
        }
      });
    });
    
    // Update previous states
    previousRepoStates.current = { ...currentRepos };
  }, [isNotificationThrottled, createNotification, addNotification, addError]);

  // Monitor repository changes
  useEffect(() => {
    if (!state.workspaces[state.active_workspace]) return;
    
    const currentRepos = state.workspaces[state.active_workspace].repositories;
    
    // Only check rules if we have previous states (not on initial load)
    if (Object.keys(previousRepoStates.current).length > 0) {
      checkNotificationRules(currentRepos);
    } else {
      // Initialize previous states on first load
      previousRepoStates.current = { ...currentRepos };
    }
  }, [state.workspaces, state.active_workspace, checkNotificationRules]);

  // Clear old notifications periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      const currentNotifications = state.layout.header.notifications;
      const filteredNotifications = currentNotifications.filter(
        notification => now - notification.timestamp < maxAge
      );
      
      if (filteredNotifications.length !== currentNotifications.length) {
        setLayout({
          header: {
            ...state.layout.header,
            notifications: filteredNotifications
          }
        });
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(cleanupInterval);
  }, [state.layout.header, setLayout]);

  const markAllNotificationsRead = useCallback(() => {
    const updatedNotifications = state.layout.header.notifications.map(n => ({
      ...n,
      is_read: true
    }));
    
    setLayout({
      header: {
        ...state.layout.header,
        notifications: updatedNotifications
      }
    });
  }, [state.layout.header, setLayout]);

  const markNotificationRead = useCallback((notificationId: string) => {
    const updatedNotifications = state.layout.header.notifications.map(n =>
      n.id === notificationId ? { ...n, is_read: true } : n
    );
    
    setLayout({
      header: {
        ...state.layout.header,
        notifications: updatedNotifications
      }
    });
  }, [state.layout.header, setLayout]);

  const removeNotification = useCallback((notificationId: string) => {
    const filteredNotifications = state.layout.header.notifications.filter(
      n => n.id !== notificationId
    );
    
    setLayout({
      header: {
        ...state.layout.header,
        notifications: filteredNotifications
      }
    });
  }, [state.layout.header, setLayout]);

  // Create manual notification (for testing or specific events)
  const createManualNotification = useCallback((
    type: NotificationType,
    title: string,
    message: string,
    repositoryId?: string
  ) => {
    const notification: Notification = {
      id: `manual-${Date.now()}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      is_read: false,
      repository_id: repositoryId
    };
    
    addNotification(notification);
    return notification.id;
  }, [addNotification]);

  // Get notification statistics
  const getNotificationStats = useCallback(() => {
    const notifications = state.layout.header.notifications;
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      byType: {
        info: notifications.filter(n => n.type === 'info').length,
        success: notifications.filter(n => n.type === 'success').length,
        warning: notifications.filter(n => n.type === 'warning').length,
        error: notifications.filter(n => n.type === 'error').length
      },
      recentCount: notifications.filter(n => Date.now() - n.timestamp < 86400000).length // Last 24h
    };
    
    return stats;
  }, [state.layout.header.notifications]);

  return {
    notifications: state.layout.header.notifications,
    unreadCount: state.layout.header.notifications.filter(n => !n.is_read).length,
    markAllNotificationsRead,
    markNotificationRead,
    removeNotification,
    createManualNotification,
    getNotificationStats
  };
};

export default useSmartNotifications;