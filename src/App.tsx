import React from 'react';
import { AppStateProvider } from './contexts/AppStateContext';
import MainLayout from './components/layout/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Import legacy components for backward compatibility (optional)
import Dashboard from "./Dashboard";
import CommitHistory from "./CommitHistory";
import DiffViewer from "./DiffViewer";
import MergeInteractive from "./MergeInteractive";
import ConflictResolver from "./ConflictResolver";
import BranchManager from "./BranchManager";
import Settings from "./Settings";
import Account from "./Account";
import RepositoryCreator from "./RepositoryCreator";

const App = () => {
  return (
    <ErrorBoundary>
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </ErrorBoundary>
  );
};

const AppContent = () => {
  return (
    <div className="app">
      <MainLayout />
    </div>
  );
};

export default App;