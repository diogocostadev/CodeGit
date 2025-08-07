import React, { useCallback } from 'react';
import { LayoutState, MainViewMode } from '../../types/state';
import { useAppState } from '../../contexts/AppStateContext';
import Header from './Header';
import RepositorySidebar from './RepositorySidebar';
import MainWorkspace from './MainWorkspace';
import DetailsPanel from './DetailsPanel';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const { state, setLayout, setCurrentRepository, setViewMode } = useAppState();

  const handleLayoutChange = useCallback((layoutChanges: Partial<LayoutState>) => {
    const newLayout = { ...state.layout, ...layoutChanges };
    setLayout(newLayout);
  }, [state.layout, setLayout]);

  const handleSidebarToggle = useCallback(() => {
    handleLayoutChange({
      sidebar: {
        ...state.layout.sidebar,
        is_collapsed: !state.layout.sidebar.is_collapsed
      }
    });
  }, [state.layout.sidebar, handleLayoutChange]);

  const handleDetailsPanelToggle = useCallback(() => {
    handleLayoutChange({
      details_panel: {
        ...state.layout.details_panel,
        is_collapsed: !state.layout.details_panel.is_collapsed
      }
    });
  }, [state.layout.details_panel, handleLayoutChange]);

  const handleSidebarResize = useCallback((width: number) => {
    handleLayoutChange({
      sidebar: {
        ...state.layout.sidebar,
        width: Math.max(200, Math.min(600, width))
      }
    });
  }, [state.layout.sidebar, handleLayoutChange]);

  const handleDetailsPanelResize = useCallback((width: number) => {
    handleLayoutChange({
      details_panel: {
        ...state.layout.details_panel,
        width: Math.max(250, Math.min(800, width))
      }
    });
  }, [state.layout.details_panel, handleLayoutChange]);

  const handleRepositorySelect = useCallback((repositoryId: string) => {
    setCurrentRepository(repositoryId);
  }, [setCurrentRepository]);

  const handleViewModeChange = useCallback((mode: MainViewMode) => {
    setViewMode(mode);
    // Also reset selected items when changing view mode
    handleLayoutChange({
      main_view: {
        ...state.layout.main_view,
        mode,
        selectedCommit: undefined,
        selectedFile: undefined,
      }
    });
  }, [setViewMode, state.layout.main_view, handleLayoutChange]);

  const currentWorkspace = state.workspaces[state.active_workspace];
  const currentRepository = state.current_repository 
    ? currentWorkspace?.repositories[state.current_repository]
    : undefined;

  return (
    <div className="main-layout">
      {/* Header */}
      <Header
        appState={state}
        layout={state.layout.header}
        onLayoutChange={(headerChanges) => handleLayoutChange({ header: headerChanges })}
        onSidebarToggle={handleSidebarToggle}
        onDetailsPanelToggle={handleDetailsPanelToggle}
      />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Repository Sidebar */}
        {!state.layout.sidebar.is_collapsed && (
          <>
            <RepositorySidebar
              workspace={currentWorkspace}
              layout={state.layout.sidebar}
              selectedRepository={state.current_repository}
              onRepositorySelect={handleRepositorySelect}
              onLayoutChange={(sidebarChanges) => handleLayoutChange({ sidebar: { ...state.layout.sidebar, ...sidebarChanges } })}
            />
            <div 
              className="resize-handle resize-handle-vertical"
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startWidth = state.layout.sidebar.width;

                const handleMouseMove = (e: MouseEvent) => {
                  const deltaX = e.clientX - startX;
                  handleSidebarResize(startWidth + deltaX);
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          </>
        )}

        {/* Main Workspace */}
        <MainWorkspace
          repository={currentRepository}
          layout={state.layout.main_view}
          onViewModeChange={handleViewModeChange}
          onLayoutChange={(mainViewChanges) => handleLayoutChange({ main_view: mainViewChanges })}
        />

        {/* Details Panel */}
        {!state.layout.details_panel.is_collapsed && (
          <>
            <div 
              className="resize-handle resize-handle-vertical"
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startWidth = state.layout.details_panel.width;

                const handleMouseMove = (e: MouseEvent) => {
                  const deltaX = startX - e.clientX; // Inverted for right panel
                  handleDetailsPanelResize(startWidth + deltaX);
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
            <DetailsPanel
              repository={currentRepository}
              layout={state.layout.details_panel}
              mainViewState={state.layout.main_view}
              onLayoutChange={(detailsChanges) => handleLayoutChange({ details_panel: detailsChanges })}
            />
          </>
        )}
      </div>

      {/* Keyboard shortcuts overlay (if enabled) */}
      {state.layout.shortcuts && (
        <div className="keyboard-shortcuts-overlay" style={{ display: 'none' }}>
          {/* Will be implemented later */}
        </div>
      )}
    </div>
  );
};

export default MainLayout;